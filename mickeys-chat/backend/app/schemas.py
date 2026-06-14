from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any
from datetime import datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[int] = None
    username: Optional[str] = None

# --- User Schemas ---
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class UserUpdate(BaseModel):
    status: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class UserResponse(UserBase):
    id: int
    status: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- File Attachment Schemas ---
class FileAttachmentResponse(BaseModel):
    id: int
    file_name: str
    file_type: str
    file_path: str
    file_size: int
    uploaded_at: datetime

    class Config:
        from_attributes = True

# --- Message Reaction Schemas ---
class MessageReactionResponse(BaseModel):
    id: int
    message_id: int
    user_id: int
    reaction: str

    class Config:
        from_attributes = True

# --- Message Schemas ---
class MessageCreate(BaseModel):
    content: str
    reply_to_id: Optional[int] = None
    is_encrypted: Optional[bool] = False

class MessageResponse(BaseModel):
    id: int
    chat_room_id: int
    sender_id: int
    sender: UserResponse
    content: str
    reply_to_id: Optional[int] = None
    is_encrypted: bool
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    attachments: List[FileAttachmentResponse] = []
    reactions: List[MessageReactionResponse] = []

    class Config:
        from_attributes = True

# --- Chat Room Schemas ---
class ChatRoomBase(BaseModel):
    name: Optional[str] = None
    is_group: bool = False
    is_private: bool = True

class ChatRoomCreate(ChatRoomBase):
    member_ids: List[int] = []  # Users to add when creating a group

class GroupMemberResponse(BaseModel):
    id: int
    chat_room_id: int
    user_id: int
    user: UserResponse
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True

class ChatRoomResponse(ChatRoomBase):
    id: int
    creator_id: Optional[int] = None
    theme: str
    created_at: datetime
    members: List[GroupMemberResponse] = []
    # We can fetch the last message for recent chats list
    last_message: Optional[MessageResponse] = None

    class Config:
        from_attributes = True

# --- Friend Request Schemas ---
class FriendRequestCreate(BaseModel):
    receiver_username: str

class FriendRequestResponse(BaseModel):
    id: int
    sender_id: int
    sender: UserResponse
    receiver_id: int
    receiver: UserResponse
    status: str  # pending, accepted, declined
    created_at: datetime

    class Config:
        from_attributes = True

# --- Notification Schemas ---
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: str
    is_read: bool
    type: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Analytics / Admin Panel Schemas ---
class AnalyticsStats(BaseModel):
    total_users: int
    online_users: int
    total_messages: int
    total_rooms: int
    messages_by_date: List[Any]
    users_by_status: List[Any]
