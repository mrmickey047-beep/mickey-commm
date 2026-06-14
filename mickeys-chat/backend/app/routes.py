import os
import shutil
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from app.database import get_db
from app.config import settings
from app import models, schemas, auth

router = APIRouter()

# =====================================================================
# AUTHENTICATION ROUTERS
# =====================================================================

@router.post("/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(models.User).filter(
        or_(models.User.username == user_in.username, models.User.email == user_in.email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    # Create new user
    hashed_pwd = auth.get_password_hash(user_in.password)
    user = models.User(
        username=user_in.username,
        email=user_in.email,
        password_hash=hashed_pwd,
        status="offline",
        avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={user_in.username}" # Free dynamic avatar
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/auth/login", response_model=schemas.Token)
def login(login_in: schemas.UserLogin, db: Session = Depends(get_db)):
    # Query user by username or email
    user = db.query(models.User).filter(
        or_(models.User.username == login_in.username_or_email, models.User.email == login_in.username_or_email)
    ).first()

    if not user or not auth.verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password"
        )

    # Generate access token
    access_token = auth.create_access_token(data={"sub": str(user.id)})

    # Save user session
    session_token = auth.create_access_token(data={"sub": str(user.id), "type": "session"})
    session = models.UserSession(
        user_id=user.id,
        session_token=session_token,
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    db.add(session)
    db.commit()

    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/auth/profile", response_model=schemas.UserResponse)
def get_profile(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@router.put("/auth/profile", response_model=schemas.UserResponse)
def update_profile(user_update: schemas.UserUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if user_update.status is not None:
        current_user.status = user_update.status
    if user_update.bio is not None:
        current_user.bio = user_update.bio
    if user_update.avatar_url is not None:
        current_user.avatar_url = user_update.avatar_url
    db.commit()
    db.refresh(current_user)
    return current_user

# =====================================================================
# CHAT ROOMS & GROUPS ROUTERS
# =====================================================================

@router.get("/rooms", response_model=List[schemas.ChatRoomResponse])
def get_rooms(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Find all rooms where current_user is a member
    memberships = db.query(models.GroupMember).filter(models.GroupMember.user_id == current_user.id).all()
    room_ids = [m.chat_room_id for m in memberships]

    rooms = db.query(models.ChatRoom).filter(models.ChatRoom.id.in_(room_ids)).all()
    
    # We populate the rooms with last message manually for frontend UX sorting
    response_rooms = []
    for r in rooms:
        # Load last message
        last_msg = db.query(models.Message).filter(models.Message.chat_room_id == r.id).order_by(models.Message.created_at.desc()).first()
        r.last_message = last_msg
        response_rooms.append(r)
        
    # Sort rooms by last message time, or created_at if no message exists
    response_rooms.sort(
        key=lambda x: x.last_message.created_at if x.last_message else x.created_at,
        reverse=True
    )
    return response_rooms

@router.post("/rooms/create", response_model=schemas.ChatRoomResponse)
def create_room(room_in: schemas.ChatRoomCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Create the chat room
    new_room = models.ChatRoom(
        name=room_in.name,
        is_group=room_in.is_group,
        is_private=room_in.is_private,
        creator_id=current_user.id
    )
    db.add(new_room)
    db.flush() # get new_room.id

    # 1. Add current user as admin
    admin_member = models.GroupMember(
        chat_room_id=new_room.id,
        user_id=current_user.id,
        role="admin"
    )
    db.add(admin_member)

    # 2. Add other members
    for uid in room_in.member_ids:
        if uid != current_user.id:
            member = models.GroupMember(
                chat_room_id=new_room.id,
                user_id=uid,
                role="member"
            )
            db.add(member)
    
    db.commit()
    db.refresh(new_room)
    return new_room

@router.get("/rooms/{room_id}/messages", response_model=List[schemas.MessageResponse])
def get_messages(room_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Verify user is a member of this room
    membership = db.query(models.GroupMember).filter(
        models.GroupMember.chat_room_id == room_id,
        models.GroupMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this chat room"
        )

    # Query all messages
    messages = db.query(models.Message).filter(
        models.Message.chat_room_id == room_id
    ).order_by(models.Message.created_at.asc()).all()
    return messages

@router.put("/rooms/{room_id}/theme", response_model=schemas.ChatRoomResponse)
def update_room_theme(room_id: int, theme: str, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Verify user is a member
    membership = db.query(models.GroupMember).filter(
        models.GroupMember.chat_room_id == room_id,
        models.GroupMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Forbidden")

    room = db.query(models.ChatRoom).filter(models.ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    room.theme = theme
    db.commit()
    db.refresh(room)
    return room

# =====================================================================
# USERS & FRIENDS ROUTERS
# =====================================================================

@router.get("/users/search", response_model=List[schemas.UserResponse])
def search_users(q: str, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if len(q) < 2:
        return []
    # Find users whose username starts with query and is not the current user
    users = db.query(models.User).filter(
        and_(
            models.User.username.like(f"%{q}%"),
            models.User.id != current_user.id
        )
    ).limit(10).all()
    return users

@router.get("/friends", response_model=List[schemas.UserResponse])
def get_friends(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Friends are users where FriendRequest is status='accepted'
    requests = db.query(models.FriendRequest).filter(
        and_(
            or_(models.FriendRequest.sender_id == current_user.id, models.FriendRequest.receiver_id == current_user.id),
            models.FriendRequest.status == "accepted"
        )
    ).all()

    friend_ids = []
    for r in requests:
        if r.sender_id == current_user.id:
            friend_ids.append(r.receiver_id)
        else:
            friend_ids.append(r.sender_id)

    friends = db.query(models.User).filter(models.User.id.in_(friend_ids)).all()
    return friends

@router.get("/friends/requests", response_model=List[schemas.FriendRequestResponse])
def get_friend_requests(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    requests = db.query(models.FriendRequest).filter(
        and_(
            models.FriendRequest.receiver_id == current_user.id,
            models.FriendRequest.status == "pending"
        )
    ).all()
    return requests

@router.post("/friends/request", response_model=schemas.FriendRequestResponse)
def send_friend_request(request_in: schemas.FriendRequestCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    receiver = db.query(models.User).filter(models.User.username == request_in.receiver_username).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")
    
    if receiver.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot friend request yourself")

    # Check if request already exists
    existing = db.query(models.FriendRequest).filter(
        or_(
            and_(models.FriendRequest.sender_id == current_user.id, models.FriendRequest.receiver_id == receiver.id),
            and_(models.FriendRequest.sender_id == receiver.id, models.FriendRequest.receiver_id == current_user.id)
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Friend request already sent or relationship exists")

    new_req = models.FriendRequest(
        sender_id=current_user.id,
        receiver_id=receiver.id,
        status="pending"
    )
    db.add(new_req)
    
    # Create notification for receiver
    notification = models.Notification(
        user_id=receiver.id,
        title="New Friend Request",
        description=f"{current_user.username} sent you a friend request.",
        type="friend_request"
    )
    db.add(notification)
    
    db.commit()
    db.refresh(new_req)
    return new_req

@router.post("/friends/accept/{req_id}", response_model=schemas.FriendRequestResponse)
def accept_friend_request(req_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    req = db.query(models.FriendRequest).filter(
        and_(models.FriendRequest.id == req_id, models.FriendRequest.receiver_id == current_user.id)
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Friend request not found")

    req.status = "accepted"
    
    # Automatically create a DM ChatRoom between these two users
    # Check if a DM room already exists between these two
    existing_rooms = db.query(models.ChatRoom).filter(models.ChatRoom.is_group == False).all()
    dm_room = None
    for r in existing_rooms:
        m_ids = [m.user_id for m in r.members]
        if len(m_ids) == 2 and req.sender_id in m_ids and req.receiver_id in m_ids:
            dm_room = r
            break

    if not dm_room:
        dm_room = models.ChatRoom(is_group=False, is_private=True)
        db.add(dm_room)
        db.flush()
        
        # Add members
        m1 = models.GroupMember(chat_room_id=dm_room.id, user_id=req.sender_id, role="member")
        m2 = models.GroupMember(chat_room_id=dm_room.id, user_id=req.receiver_id, role="member")
        db.add(m1)
        db.add(m2)

    # Notify sender
    notification = models.Notification(
        user_id=req.sender_id,
        title="Friend Request Accepted",
        description=f"{current_user.username} accepted your friend request.",
        type="friend_request"
    )
    db.add(notification)

    db.commit()
    db.refresh(req)
    return req

@router.post("/friends/decline/{req_id}", response_model=schemas.FriendRequestResponse)
def decline_friend_request(req_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    req = db.query(models.FriendRequest).filter(
        and_(models.FriendRequest.id == req_id, models.FriendRequest.receiver_id == current_user.id)
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Friend request not found")

    req.status = "declined"
    db.commit()
    db.refresh(req)
    return req

# =====================================================================
# UPLOADS & FILE SHARING ROUTER
# =====================================================================

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: models.User = Depends(auth.get_current_user)):
    file_name = file.filename
    # Generate unique subfolder or prefix
    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S%f")
    safe_name = f"{timestamp}_{file_name}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_name)

    # Save file on local disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Determine file category
    ext = os.path.splitext(file_name)[1].lower()
    file_type = "other"
    if ext in [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]:
        file_type = "image"
    elif ext in [".mp4", ".mov", ".avi", ".mkv", ".webm"]:
        file_type = "video"
    elif ext in [".pdf"]:
        file_type = "pdf"
    elif ext in [".mp3", ".wav", ".m4a", ".ogg", ".webm"]:
        file_type = "audio"

    # Return virtual path and metadata
    return {
        "file_name": file_name,
        "file_type": file_type,
        "file_path": f"/uploads/{safe_name}", # Serve via static mount
        "file_size": os.path.getsize(file_path)
    }

# =====================================================================
# NOTIFICATIONS ROUTER
# =====================================================================

@router.get("/notifications", response_model=List[schemas.NotificationResponse])
def get_notifications(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).limit(20).all()

@router.post("/notifications/read-all")
def read_all_notifications(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read"}

# =====================================================================
# BACKUP & RESTORE ROUTERS
# =====================================================================

@router.get("/backup/export")
def export_backup(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Export rooms and messages user belongs to
    memberships = db.query(models.GroupMember).filter(models.GroupMember.user_id == current_user.id).all()
    room_ids = [m.chat_room_id for m in memberships]

    rooms = db.query(models.ChatRoom).filter(models.ChatRoom.id.in_(room_ids)).all()
    messages = db.query(models.Message).filter(models.Message.chat_room_id.in_(room_ids)).all()

    rooms_data = [
        {
            "id": r.id,
            "name": r.name,
            "is_group": r.is_group,
            "is_private": r.is_private,
            "creator_id": r.creator_id,
            "theme": r.theme,
            "created_at": r.created_at.isoformat()
        } for r in rooms
    ]

    messages_data = [
        {
            "id": m.id,
            "chat_room_id": m.chat_room_id,
            "sender_id": m.sender_id,
            "sender_username": m.sender.username,
            "content": m.content,
            "reply_to_id": m.reply_to_id,
            "is_encrypted": m.is_encrypted,
            "is_deleted": m.is_deleted,
            "created_at": m.created_at.isoformat()
        } for m in messages
    ]

    return {
        "version": "1.0",
        "exported_at": datetime.datetime.utcnow().isoformat(),
        "username": current_user.username,
        "rooms": rooms_data,
        "messages": messages_data
    }

@router.post("/backup/restore")
def restore_backup(data: dict, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Basic validation of input
    if "rooms" not in data or "messages" not in data:
        raise HTTPException(status_code=400, detail="Invalid backup file structure")

    restored_rooms_count = 0
    restored_msgs_count = 0

    try:
        # Import rooms
        for r_data in data["rooms"]:
            # Check if room already exists or if we should recreate
            existing_room = db.query(models.ChatRoom).filter(models.ChatRoom.id == r_data["id"]).first()
            if not existing_room:
                new_room = models.ChatRoom(
                    id=r_data["id"],
                    name=r_data.get("name"),
                    is_group=r_data.get("is_group", False),
                    is_private=r_data.get("is_private", True),
                    creator_id=r_data.get("creator_id"),
                    theme=r_data.get("theme", "default"),
                    created_at=datetime.datetime.fromisoformat(r_data["created_at"])
                )
                db.add(new_room)
                # Check if current user is member, if not add them
                m_check = models.GroupMember(
                    chat_room_id=new_room.id,
                    user_id=current_user.id,
                    role="member"
                )
                db.add(m_check)
                restored_rooms_count += 1
        
        db.flush()

        # Import messages
        for m_data in data["messages"]:
            existing_msg = db.query(models.Message).filter(models.Message.id == m_data["id"]).first()
            if not existing_msg:
                # Resolve sender
                sender_id = m_data.get("sender_id")
                # Fallback to current user if sender doesn't exist
                sender_exists = db.query(models.User).filter(models.User.id == sender_id).first()
                if not sender_exists:
                    sender_id = current_user.id

                new_msg = models.Message(
                    id=m_data["id"],
                    chat_room_id=m_data["chat_room_id"],
                    sender_id=sender_id,
                    content=m_data["content"],
                    reply_to_id=m_data.get("reply_to_id"),
                    is_encrypted=m_data.get("is_encrypted", False),
                    is_deleted=m_data.get("is_deleted", False),
                    created_at=datetime.datetime.fromisoformat(m_data["created_at"])
                )
                db.add(new_msg)
                restored_msgs_count += 1
        
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to restore backup: {str(e)}")

    return {
        "status": "success",
        "restored_rooms": restored_rooms_count,
        "restored_messages": restored_msgs_count
    }

# =====================================================================
# ANALYTICS & ADMIN ROUTERS
# =====================================================================

@router.get("/analytics", response_model=schemas.AnalyticsStats)
def get_analytics(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Calculate stats
    total_users = db.query(func.count(models.User.id)).scalar()
    online_users = db.query(func.count(models.User.id)).filter(models.User.status == "online").scalar()
    total_messages = db.query(func.count(models.Message.id)).scalar()
    total_rooms = db.query(func.count(models.ChatRoom.id)).scalar()

    # Query last 7 days message count
    today = datetime.date.today()
    messages_by_date = []
    for i in range(7):
        d = today - datetime.timedelta(days=i)
        start = datetime.datetime.combine(d, datetime.time.min)
        end = datetime.datetime.combine(d, datetime.time.max)
        count = db.query(func.count(models.Message.id)).filter(
            and_(models.Message.created_at >= start, models.Message.created_at <= end)
        ).scalar()
        messages_by_date.append({"date": d.strftime("%m-%d"), "count": count})
    messages_by_date.reverse()

    # Query user count grouped by status
    status_counts = db.query(models.User.status, func.count(models.User.id)).group_by(models.User.status).all()
    users_by_status = [{"status": s, "count": c} for s, c in status_counts]

    return {
        "total_users": total_users,
        "online_users": online_users,
        "total_messages": total_messages,
        "total_rooms": total_rooms,
        "messages_by_date": messages_by_date,
        "users_by_status": users_by_status
    }
