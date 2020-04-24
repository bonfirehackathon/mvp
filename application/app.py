from flask import request, render_template, jsonify, url_for, redirect, g, Flask, Response, send_file,make_response,send_from_directory
from flask_restful import Resource
from flask_cors import CORS,cross_origin

from .models import User, Challenge, ChallengeInstance, ChallengeComment, ChallengeFollower, ChallengeMedia, ChallengeParticipant, ChallengeInstanceMedia, ChallengeInstanceVote
from .models import ChallengeSchema, ChallengeInstanceSchema, ChallengeParticipantSchema, ChallengeMediaSchema, ChallengeInstanceMediaSchema, ChallengeInstanceVoteSchema
from .twilio_client import TwilioClient

from index import app, db, ma, api
from flask_cors import CORS
import json

from sqlalchemy.exc import IntegrityError
from .utils.auth import generate_token, requires_auth, verify_token

import io

ALLOWED_EXTENSIONS = set(['txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif'])

cors = CORS(app, allow_headers='Content-Type', CORS_SEND_WILDCARD=True)

#  TODO Re-add authorized endpoints...
challenge_schema = ChallengeSchema()
challenges_schema = ChallengeSchema(many=True)
challenge_instance_schema = ChallengeInstanceSchema()
challenge_participant_schema = ChallengeParticipantSchema()
challenge_participants_schema = ChallengeParticipantSchema(many=True)
challenge_media_schema = ChallengeMediaSchema()
challenge_medias_schema = ChallengeMediaSchema(many=True)
challenge_instance_media_schema = ChallengeInstanceMediaSchema()
challenge_instance_medias_schema = ChallengeInstanceMediaSchema(many=True)
challenge_instance_vote_schema = ChallengeInstanceVoteSchema()
challenge_instance_votes_schema = ChallengeInstanceVoteSchema(many=True)

cors = CORS(app)

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')


@app.route('/<path:path>', methods=['GET'])
def any_root_path(path):
    return render_template('index.html')


@app.route("/api/user", methods=["GET"])
# @requires_auth
def get_user():
    return jsonify(result=g.current_user)


@app.route("/api/create_user", methods=["POST"])
def create_user():
    incoming = request.get_json()
    user = User(
        email=incoming["email"],
        password=incoming["password"]
    )
    db.session.add(user)

    try:
        db.session.commit()
    except IntegrityError:
        return jsonify(message="User with that email already exists"), 409

    new_user = User.query.filter_by(email=incoming["email"]).first()

    return jsonify(
        id=user.id,
        token=generate_token(new_user)
    )

class ChallengeListResource(Resource):
    def get(self):
        challenges = Challenge.query.all()
        return challenges_schema.dump(challenges)

    def post(self):
        incoming = request.get_json()
        challenge = Challenge(
            name=incoming["name"],
            desc=incoming["desc"],
            preview_uri=incoming["preview_uri"],
            listing_uri=incoming["listing_uri"],
            creator=g.current_user
        )
        db.session.add(challenge)

        try:
            db.session.commit()
        except Exception:
            return jsonify(message="Issue creating a challenge. Check logs... and make better errors once we're done the hackathon"), 400

        return challenge_schema.dump(challenge)

api.add_resource(ChallengeListResource, '/api/challenges')

class ChallengeResource(Resource):
    def get(self, challenge_id):
        challenge = Challenge.query.get_or_404(challenge_id)
        return challenge_schema.dump(challenge)

api.add_resource(ChallengeResource, '/api/challenge/<int:challenge_id>')

class ChallengeInstanceResource(Resource):
    def get(self, challenge_instance_id):
        challenge_instance = ChallengeInstance.query.get_or_404(challenge_instance_id)
        return challenge_instance_schema.dump(challenge_instance)

api.add_resource(ChallengeInstanceResource, '/api/challenge_instance/<int:challenge_instance_id>')

class ChallengeParticipantResource(Resource):
    def get(self, challenge_instance_id):
        challenges_participants = ChallengeParticipant.query.filter_by(challenge_instance_id=challenge_instance_id)
        return challenge_participants_schema.dump(challenges_participants)

    def post(self):
        incoming = request.get_json()
        challenge_participant = ChallengeParticipant(
            challenge_instance=incoming["challenge_instance_id"],
            participant=g.current_user
        )
        db.session.add(challenge_participant)

        try:
            db.session.commit()
        except Exception:
            return jsonify(message="Issue adding a participant to a challenge. Check logs... and make better errors once we're done the hackathon"), 400

        return challenge_participant_schema.dump(challenge_participant)

api.add_resource(ChallengeParticipantResource, '/api/challenge_participant/<int:challenge_instance_id>')

class ChallengeMediaResource(Resource):
    def get(self, challenge_id):
        challenge_media = ChallengeMedia.query.filter_by(challenge_id=challenge_id)
        return challenge_medias_schema.dump(challenge_media)

    def post(self):
        incoming = request.get_json()
        challenge_media = ChallengeMedia(
            challenge=incoming["challenge_id"],
            uri=incoming["uri"],
            tooltip=incoming["tooltip"]
        )
        db.session.add(challenge_media)

        try:
            db.session.commit()
        except Exception:
            return jsonify(message="Issue adding media to a challenge. Check logs... and make better errors once we're done the hackathon"), 400

        return challenge_media_schema.dump(challenge_media)

api.add_resource(ChallengeMediaResource, '/api/challenge_media/<int:challenge_id>')

# TODO re-add user id into call
class ChallengeInstanceMediaResource(Resource):
    def post(self, instance_id):
        incoming = request.get_json()
        challenge_instance_media = ChallengeInstanceMedia(
            challenge_instance=ChallengeInstance.query.get_or_404(incoming["instance_id"]),
            user=None,
            data=incoming["data_uri"]
        )
        db.session.add(challenge_instance_media)

        try:
            db.session.commit()
        except Exception:
            return jsonify(message="Issue adding media to a challenge. Check logs... and make better errors once we're done the hackathon"), 400

        return challenge_instance_media_schema.dump(challenge_instance_media)

api.add_resource(ChallengeInstanceMediaResource, '/api/challenge_instance_upload/<int:instance_id>')

@app.route("/api/get_all_uploads/<int:instance_id>", methods=["GET"])
def get_challenge_media(instance_id):
    challenge_instance_media = ChallengeInstanceMedia.query.filter_by(challenge_instance_id=instance_id)
    if challenge_instance_media.count() > 2:
        return jsonify(challenge_instance_medias_schema.dump(challenge_instance_media))
    
    return jsonify(message="Media for challenge not ready"), 400

@app.route("/api/submit_vote", methods=["POST"])
def submit_vote():
    incoming = request.get_json()
    challenge_instance_vote = ChallengeInstanceVote(
        challenge_instance=ChallengeInstance.query.get_or_404(incoming['instance_id']),
        votee=ChallengeInstanceMedia.query.get_or_404(incoming['votee_id'])
    )
    db.session.add(challenge_instance_vote)

    try:
        db.session.commit()
    except Exception:
        return jsonify(message="Issue submitting Vote. Check logs... and make better errors once we're done the hackathon"), 400

    return jsonify(challenge_instance_vote_schema.dump(challenge_instance_vote))

@app.route("/api/get_vote_results/<int:instance_id>", methods=["GET"])
def get_vote_results(instance_id):
    votes = ChallengeInstanceVote.query.filter_by(challenge_instance_id=instance_id)
    if votes.count() > 2:
        return jsonify(challenge_instance_votes_schema.dump(votes))
    
    return jsonify(message="Votes for challenge not ready"), 400

@app.route("/api/create_challenge")
def create_challenge():
    challenge = Challenge(
        desc="test challenge",
        creator=None,
        preview_uri="yt/dQw4w9WgXcQ",
        listing_uri="none",
        name="test challenge name"
    )
    db.session.add(challenge)

    try:
        db.session.commit()
    except Exception:
        return jsonify(message="Issue creating challenge. Check logs... and make better errors once we're done the hackathon"), 400
    
    return jsonify(challenge_schema.dump(challenge))

@app.route("/api/create_instance/<int:challenge_id>", methods=["GET"])
def create_instance(challenge_id):
    challenge_instance = ChallengeInstance(
        challenge=Challenge.query.get_or_404(challenge_id),
        creator=None
    )
    db.session.add(challenge_instance)

    try:
        db.session.commit()
    except Exception:
        return jsonify(message="Issue creating instance. Check logs... and make better errors once we're done the hackathon"), 400
    
    return jsonify(challenge_instance_schema.dump(challenge_instance))

@app.route("/api/clear_all_votes/<int:instance_id>", methods=["GET"])
def clear_votes(instance_id):
    ChallengeInstanceVote.query.filter_by(challenge_instance_id=instance_id).delete()
    db.session.commit()

    return jsonify(message="All Votes Deleted!"), 200

@app.route("/api/clear_all_media/<int:instance_id>", methods=["GET"])
def clear_media(instance_id):
    ChallengeInstanceMedia.query.filter_by(challenge_instance_id=instance_id).delete()
    db.session.commit()

    return jsonify(message="All Media Deleted!"), 200


@app.route("/api/get_twilio_token", methods=["POST"])
def get_twilio_token():
    incoming = request.get_json()
    twilio_client = TwilioClient(incoming['identity'], incoming['room'])
    return jsonify(token=twilio_client.get_token().decode("utf-8"))

# ---- Mock Endpoints START
@app.route("/api/get_mock_media", methods=["GET"])
def get_mock_media():
    return json.dumps([{ "id": "test media id", "challenge_id": "1", "uri": "yt/dQw4w9WgXcQ", "priority": 1, "tooltip": "tsts" }])
# ---- Mock Endpoints END

@app.route("/api/get_token", methods=["POST"])
def get_token():
    incoming = request.get_json()
    user = User.get_user_with_email_and_password(incoming["email"], incoming["password"])
    if user:
        return jsonify(token=generate_token(user))

    return jsonify(error=True), 403


@app.route("/api/is_token_valid", methods=["POST"])
def is_token_valid():
    incoming = request.get_json()
    is_valid = verify_token(incoming["token"])

    if is_valid:
        return jsonify(token_is_valid=True)
    else:
        return jsonify(token_is_valid=False), 403
