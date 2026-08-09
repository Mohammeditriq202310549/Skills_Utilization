from sqlalchemy import create_engine
from config import Config

# Create SQLAlchemy Core engine
engine = create_engine(Config.SQLALCHEMY_DATABASE_URI, echo=True)

def get_connection():
    """Helper function to get a raw connection from engine."""
    return engine.connect()
