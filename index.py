from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_restful import Api, Resource
from config import BaseConfig
from flask_bcrypt import Bcrypt

app = Flask(__name__, static_folder="./static/dist", template_folder="./static/public")
app.config.from_object(BaseConfig)
db = SQLAlchemy(app)
ma = Marshmallow(app)
bcrypt = Bcrypt(app)
api = Api(app)
