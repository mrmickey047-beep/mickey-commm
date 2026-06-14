import random
import asyncio

class MickeyAIAgent:
    def __init__(self):
        self.responses = [
            "Oh boy! Welcome to Mickey's Chat! How can I help you today? Haha!",
            "Hot dog! That's a great question!",
            "Gosh! I'm doing my best to assist you in this awesome real-time chat application!",
            "Did you know Mickey's Chat uses SQLite and FastAPI? It's super fast! Haha!"
        ]
        self.capabilities = (
            "Here is what I can do for you:\n"
            "1. **@mickey info** - Learn more about Mickey's Chat.\n"
            "2. **@mickey status** - Check system health and stats.\n"
            "3. **@mickey security** - Understand the security & E2E features.\n"
            "4. **@mickey joke** - Hear a funny joke!\n"
            "5. Ask me anything else, and I'll do my best to help!"
        )

    def get_response(self, message: str) -> str:
        msg = message.lower().strip()
        if "info" in msg:
            return (
                "Oh boy! Mickey's Chat is a state-of-the-art full-stack messaging app. "
                "It features glassmorphism design, FastAPI backend, SQLite database, Socket.IO real-time channels, "
                "and peer-to-peer WebRTC voice/video calls! Haha!"
            )
        elif "status" in msg or "health" in msg:
            return "Hot dog! All systems are green! Database is connected, Socket.IO channels are running smoothly, and our AI gears are spinning!"
        elif "security" in msg or "encrypt" in msg or "e2e" in msg:
            return (
                "Gosh! Mickey's Chat takes privacy seriously. In encrypted rooms, messages are encrypted "
                "client-side using AES-GCM encryption before sending. That means even the database only stores encrypted blobs! Neat, huh?"
            )
        elif "joke" in msg:
            jokes = [
                "Why did Mickey Mouse go into space? To find Pluto! Haha!",
                "What is Mickey's favorite sport? Minnie-golf! Oh boy!",
                "What kind of vehicle does Mickey Mouse drive? A Minnie-van! Haha!",
                "What does Mickey say when Minnie asks if he's listening? 'I'm all ears!' Haha!"
            ]
            return random.choice(jokes)
        elif "help" in msg or "capabilities" in msg:
            return self.capabilities
        elif any(greeting in msg for greeting in ["hello", "hi", "hey", "yo"]):
            return "Oh boy! Hello there! Welcome to Mickey's Chat! Type **@mickey help** to see what I can do! Haha!"
        else:
            return f"Haha! I heard you say: '{message}'. To explore my capabilities, try typing **@mickey help**! Gosh, chat apps are fun!"

    async def get_response_async(self, message: str) -> str:
        # Simulate thinking delay for realism
        await asyncio.sleep(1.0)
        return self.get_response(message)

mickey_ai = MickeyAIAgent()
