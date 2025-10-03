# alembic/env.py
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ensure repository root is importable (so `from app import settings` works)
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/.")

# load app settings (this will use find_dotenv/load_dotenv from app.settings)
from app import settings

# import the application's Base (declarative Base) used by models
from app.routers.db import Base

# Alembic config object
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Ensure Alembic uses the public DB URL
database_url = getattr(settings, "DATABASE_PUBLIC_URL", None) or os.getenv("DATABASE_PUBLIC_URL")
if not database_url:
    raise RuntimeError("DATABASE_PUBLIC_URL is not set. Set it in your .env or platform environment variables.")

config.set_main_option("sqlalchemy.url", database_url)

# target metadata for 'autogenerate'
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
