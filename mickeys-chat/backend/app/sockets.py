import socketio
import asyncio
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User, Message, ChatRoom, MessageReaction, GroupMember, FileAttachment
from app.auth import get_user_from_token
from app.ai_agent import mickey_ai

# Create Socket.IO ASGI server
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

# In-memory tracking of connected users
# user_id -> set of sids
user_to_sids = {}
# sid -> user_id
sid_to_user = {}

def get_db():
    db = SessionLocal()
    try:
        return db
    except Exception:
        db.close()
        raise

@sio.event
async def connect(sid, environ, auth=None):
    token = None
    if auth and isinstance(auth, dict):
        token = auth.get("token")
    
    # Try querying from headers if not in auth dictionary
    if not token:
        query_string = environ.get("QUERY_STRING", "")
        for param in query_string.split("&"):
            if param.startswith("token="):
                token = param.split("=")[1]
                break

    if not token:
        # Allow connection but unauthenticated
        return True

    db = get_db()
    try:
        user = get_user_from_token(token, db)
        if not user:
            return False  # Reject connection if token is invalid

        # Map connection
        user_id = user.id
        sid_to_user[sid] = user_id
        if user_id not in user_to_sids:
            user_to_sids[user_id] = set()
        user_to_sids[user_id].add(sid)

        # Update status to online
        user.status = "online"
        db.commit()

        # Notify others
        await sio.emit("presence_update", {"user_id": user_id, "status": "online"})
        print(f"User {user.username} connected with sid {sid}")
    except Exception as e:
        print(f"Error in connect socket: {e}")
        return False
    finally:
        db.close()
    return True

@sio.event
async def disconnect(sid):
    if sid not in sid_to_user:
        return

    user_id = sid_to_user.pop(sid)
    if user_id in user_to_sids:
        user_to_sids[user_id].discard(sid)
        if not user_to_sids[user_id]:
            # No more active connections for this user, they are offline
            user_to_sids.pop(user_id)
            db = get_db()
            try:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    user.status = "offline"
                    db.commit()
                    await sio.emit("presence_update", {"user_id": user_id, "status": "offline"})
                    print(f"User {user.username} disconnected")
            except Exception as e:
                print(f"Error in disconnect socket: {e}")
            finally:
                db.close()

@sio.event
async def join_room(sid, data):
    # data: {"room_id": 1}
    room_id = data.get("room_id")
    if not room_id:
        return
    sio.enter_room(sid, f"room_{room_id}")
    print(f"Sid {sid} joined room_{room_id}")

@sio.event
async def leave_room(sid, data):
    room_id = data.get("room_id")
    if not room_id:
        return
    sio.leave_room(sid, f"room_{room_id}")
    print(f"Sid {sid} left room_{room_id}")

@sio.event
async def typing_status(sid, data):
    # data: {"room_id": 1, "is_typing": True}
    room_id = data.get("room_id")
    is_typing = data.get("is_typing", False)
    user_id = sid_to_user.get(sid)
    if not room_id or not user_id:
        return

    db = get_db()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            # Broadcast typing status to everyone else in the room
            await sio.emit(
                "user_typing",
                {"room_id": room_id, "user_id": user_id, "username": user.username, "is_typing": is_typing},
                room=f"room_{room_id}",
                skip_sid=sid
            )
    finally:
        db.close()

@sio.event
async def send_message(sid, data):
    # data: {"room_id": 1, "content": "hello", "reply_to_id": None, "is_encrypted": False, "attachments": []}
    room_id = data.get("room_id")
    content = data.get("content", "")
    reply_to_id = data.get("reply_to_id")
    is_encrypted = data.get("is_encrypted", False)
    attachments_data = data.get("attachments", [])
    user_id = sid_to_user.get(sid)

    if not room_id or not user_id:
        return

    db = get_db()
    try:
        sender = db.query(User).filter(User.id == user_id).first()
        if not sender:
            return

        # 1. Save message to database
        message = Message(
            chat_room_id=room_id,
            sender_id=user_id,
            content=content,
            reply_to_id=reply_to_id,
            is_encrypted=is_encrypted
        )
        db.add(message)
        db.flush()  # to get message.id

        # Save any attachments
        saved_attachments = []
        for att in attachments_data:
            attachment = FileAttachment(
                message_id=message.id,
                file_name=att.get("file_name"),
                file_type=att.get("file_type"),
                file_path=att.get("file_path"),
                file_size=att.get("file_size")
            )
            db.add(attachment)
            saved_attachments.append(attachment)
        db.commit()

        # Refresh to load relationships
        db.refresh(message)

        # 2. Format message response
        msg_payload = {
            "id": message.id,
            "chat_room_id": message.chat_room_id,
            "sender_id": message.sender_id,
            "sender": {
                "id": sender.id,
                "username": sender.username,
                "email": sender.email,
                "status": sender.status,
                "avatar_url": sender.avatar_url,
                "bio": sender.bio,
                "created_at": sender.created_at.isoformat()
            },
            "content": message.content,
            "reply_to_id": message.reply_to_id,
            "is_encrypted": message.is_encrypted,
            "is_deleted": message.is_deleted,
            "created_at": message.created_at.isoformat(),
            "updated_at": message.updated_at.isoformat(),
            "attachments": [
                {
                    "id": att.id,
                    "file_name": att.file_name,
                    "file_type": att.file_type,
                    "file_path": att.file_path,
                    "file_size": att.file_size,
                    "uploaded_at": att.uploaded_at.isoformat()
                } for att in message.attachments
            ],
            "reactions": []
        }

        # Broadcast message to room members
        await sio.emit("message_received", msg_payload, room=f"room_{room_id}")

        # 3. Check for AI Assistant trigger
        # Triggered if message content starts with @mickey, or if the room name contains Mickey's AI/Assistant
        is_ai_room = False
        room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
        if room and room.name == "Mickey's Assistant":
            is_ai_room = True

        if is_ai_room or content.strip().startswith("@mickey"):
            # Clean trigger prefix if present
            ai_query = content
            if content.strip().startswith("@mickey"):
                ai_query = content.replace("@mickey", "").strip()

            # Run AI response async without blocking
            asyncio.create_task(respond_as_ai(room_id, ai_query))

    except Exception as e:
        print(f"Error in send_message socket: {e}")
        db.rollback()
    finally:
        db.close()

async def respond_as_ai(room_id: int, query: str):
    # 1. Fetch AI response
    response_text = await mickey_ai.get_response_async(query)

    db = get_db()
    try:
        # Create Mickey AI User if it doesn't exist
        ai_user = db.query(User).filter(User.username == "Mickey AI").first()
        if not ai_user:
            ai_user = User(
                username="Mickey AI",
                email="mickey@mickeyschat.ai",
                password_hash="system_ai_user",
                status="online",
                bio="Hi! I am Mickey's AI Assistant, built right into the app! Haha!",
                avatar_url="https://images.unsplash.com/photo-1608889175123-8ee362201f81?w=100&h=100&fit=crop"
            )
            db.add(ai_user)
            db.commit()
            db.refresh(ai_user)

        # 2. Save AI response message to database
        ai_message = Message(
            chat_room_id=room_id,
            sender_id=ai_user.id,
            content=response_text,
            is_encrypted=False
        )
        db.add(ai_message)
        db.commit()
        db.refresh(ai_message)

        # 3. Emit message
        ai_payload = {
            "id": ai_message.id,
            "chat_room_id": ai_message.chat_room_id,
            "sender_id": ai_message.sender_id,
            "sender": {
                "id": ai_user.id,
                "username": ai_user.username,
                "email": ai_user.email,
                "status": ai_user.status,
                "avatar_url": ai_user.avatar_url,
                "bio": ai_user.bio,
                "created_at": ai_user.created_at.isoformat()
            },
            "content": ai_message.content,
            "reply_to_id": None,
            "is_encrypted": False,
            "is_deleted": False,
            "created_at": ai_message.created_at.isoformat(),
            "updated_at": ai_message.updated_at.isoformat(),
            "attachments": [],
            "reactions": []
        }

        # Send typing effect start
        await sio.emit("user_typing", {"room_id": room_id, "user_id": ai_user.id, "username": ai_user.username, "is_typing": True}, room=f"room_{room_id}")
        await asyncio.sleep(0.8) # typing delay
        await sio.emit("user_typing", {"room_id": room_id, "user_id": ai_user.id, "username": ai_user.username, "is_typing": False}, room=f"room_{room_id}")
        
        await sio.emit("message_received", ai_payload, room=f"room_{room_id}")

    except Exception as e:
        print(f"Error generating AI socket response: {e}")
    finally:
        db.close()

@sio.event
async def reaction_toggle(sid, data):
    # data: {"message_id": 1, "reaction": "❤️"}
    message_id = data.get("message_id")
    reaction_char = data.get("reaction")
    user_id = sid_to_user.get(sid)

    if not message_id or not reaction_char or not user_id:
        return

    db = get_db()
    try:
        # Check if reaction already exists
        existing = db.query(MessageReaction).filter(
            MessageReaction.message_id == message_id,
            MessageReaction.user_id == user_id,
            MessageReaction.reaction == reaction_char
        ).first()

        if existing:
            # Delete it (toggle off)
            db.delete(existing)
        else:
            # Add new (toggle on)
            new_reaction = MessageReaction(
                message_id=message_id,
                user_id=user_id,
                reaction=reaction_char
            )
            db.add(new_reaction)
        db.commit()

        # Get all reactions for this message to build summary
        reactions = db.query(MessageReaction).filter(MessageReaction.message_id == message_id).all()
        reactions_payload = [
            {
                "id": r.id,
                "message_id": r.message_id,
                "user_id": r.user_id,
                "reaction": r.reaction
            } for r in reactions
        ]

        # Emit updated reactions to the chat room
        message = db.query(Message).filter(Message.id == message_id).first()
        if message:
            await sio.emit("reaction_updated", {"message_id": message_id, "reactions": reactions_payload}, room=f"room_{message.chat_room_id}")

    except Exception as e:
        print(f"Error in reaction_toggle socket: {e}")
        db.rollback()
    finally:
        db.close()

# --- WebRTC Calling Signaling ---
@sio.event
async def call_signal(sid, data):
    # data: {"target_user_id": 2, "signal_data": {...}, "type": "video/voice", "sender_name": "John"}
    target_user_id = data.get("target_user_id")
    signal_data = data.get("signal_data")
    call_type = data.get("type", "video")
    sender_id = sid_to_user.get(sid)

    if not target_user_id or not sender_id:
        return

    # Look up target user's active sockets
    target_sids = user_to_sids.get(int(target_user_id), [])
    for t_sid in target_sids:
        await sio.emit(
            "call_offered",
            {
                "sender_id": sender_id,
                "signal_data": signal_data,
                "type": call_type,
                "sender_name": data.get("sender_name", "Someone")
            },
            to=t_sid
        )
