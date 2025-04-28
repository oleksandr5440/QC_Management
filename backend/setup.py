from setuptools import setup, find_packages

setup(
    name="qc_management_backend",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "flask",
        "flask-sqlalchemy",
        "flask-login",
        "flask-cors",
        "pyjwt",
        "passlib",
        "psycopg2-binary",
        "gunicorn"
    ],
)