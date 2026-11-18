from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./pro_pyme.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def run_light_migrations():
    """create_all() no agrega columnas a tablas ya existentes.

    Sin esto, una base de datos en uso reventaría al añadir campos nuevos
    (bonos, horas extras, retención...). Aplicamos solo ALTER TABLE ADD COLUMN,
    que en SQLite es seguro e idempotente.
    """
    migrations = [
        ("payrolls", "base_salary", "FLOAT DEFAULT 0"),
        ("payrolls", "bonuses", "FLOAT DEFAULT 0"),
        ("payrolls", "overtime", "FLOAT DEFAULT 0"),
        ("payrolls", "afp_rate", "FLOAT DEFAULT 0"),
        ("payrolls", "retention_amount", "FLOAT DEFAULT 0"),
    ]
    inspector = inspect(engine)
    if not inspector.has_table("payrolls"):
        return
    existing = {c["name"] for c in inspector.get_columns("payrolls")}
    with engine.begin() as conn:
        for table, column, ddl in migrations:
            if column not in existing:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
