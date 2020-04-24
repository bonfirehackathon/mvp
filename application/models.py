from index import db, bcrypt, ma
import datetime

# TODO I've set a bunch of the user.id foreign keys to nullable for easy prototyping, remember to switch back to not null

# Boilerplate User model, will update as needed 
class User(db.Model):
    id = db.Column(db.Integer(), primary_key=True)
    email = db.Column(db.String(255), unique=True)
    password = db.Column(db.String(255))

    def __init__(self, email, password):
        self.email = email
        self.active = True
        self.password = User.hashed_password(password)

    @staticmethod
    def hashed_password(password):
        return bcrypt.generate_password_hash(password).decode("utf-8")

    @staticmethod
    def get_user_with_email_and_password(email, password):
        user = User.query.filter_by(email=email).first()
        if user and bcrypt.check_password_hash(user.passwo/rd, password):
            return user
        else:
            return None

# Exposed schema for Challenge model
class ChallengeSchema(ma.Schema):
    class Meta:
        fields = ("id", "name", "desc", "date_created", "preview_uri", "listing_uri", "creator_id")

# A challenge that users can participate in or follow
class Challenge(db.Model):
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(200), nullable=False) # no empty names please
    desc = db.Column(db.Text(), nullable=False) # we want to know what it is beyond a name too
    date_created = db.Column(db.DateTime(), nullable=False)
    preview_uri = db.Column(db.Text()) #preview URI
    listing_uri = db.Column(db.Text()) #listing URI

    creator_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    creator = db.relationship('User') # who?

    def __init__(self, name, desc, preview_uri, listing_uri, creator):
        self.name = name
        self.desc = desc
        self.date_created = datetime.datetime.utcnow()
        self.preview_uri = preview_uri
        self.listing_uri = listing_uri
        self.creator = creator

# Exposed schema for Challenge Instance model
class ChallengeInstanceSchema(ma.Schema):
    class Meta:
        fields = ("id", "challenge_id", "date_created", "creator_id")

# a private room instance associated to a challenge
class ChallengeInstance(db.Model):
    id = db.Column(db.Integer(), primary_key=True)

    challenge_id = db.Column(db.Integer, db.ForeignKey("challenge.id"), nullable=False)
    challenge = db.relationship('Challenge')

    date_created = db.Column(db.DateTime(), nullable=False)

    creator_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    creator = db.relationship('User')

    def __init__(self, challenge, creator):
        self.challenge = challenge
        self.date_created = datetime.datetime.utcnow()
        self.creator = creator

# Schema for ChallengeInstanceMedia
class ChallengeInstanceMediaSchema(ma.Schema):
    class Meta:
        fields = ("id", "challenge_instance_id", "user_id", "data")

# Media to represent a user's entry to the contest
class ChallengeInstanceMedia(db.Model):
    id = db.Column(db.Integer(), primary_key=True)
    data = db.Column(db.Text(), nullable=False)

    challenge_instance_id = db.Column(db.Integer(), db.ForeignKey("challenge_instance.id"), nullable=False)
    user_id = db.Column(db.Integer(), db.ForeignKey("user.id"), nullable=True)

    challenge_instance = db.relationship('ChallengeInstance')
    user = db.relationship('User')

    def __init__(self, challenge_instance, user, data):
        self.challenge_instance = challenge_instance
        self.user = user
        self.data = data

    @staticmethod
    def get_media(instance_id):
        challenge_instance_media = ChallengeInstanceMedia.query.filter_by(challenge_instance_id=instance_id)
        return ChallengeInstanceMediaSchema.dump(challenge_instance_media)

# Schema for ChallengeInstanceVote
class ChallengeInstanceVoteSchema(ma.Schema):
    class Meta:
        fields = ("id", "challenge_instance_id", "votee_id")

# A vote for a participant of a challenge instance
class ChallengeInstanceVote(db.Model):
    id = db.Column(db.Integer(), primary_key=True)

    challenge_instance_id = db.Column(db.Integer(), db.ForeignKey("challenge_instance.id"), nullable=False)
    challenge_instance = db.relationship('ChallengeInstance')

    votee_id = db.Column(db.Integer, db.ForeignKey("challenge_instance_media.id"), nullable=False)
    votee = db.relationship('ChallengeInstanceMedia') #since this is a temporary model, I won't add too many constraits

    def __init__(self, challenge_instance, votee):
        self.challenge_instance = challenge_instance
        self.votee = votee

# A comment on a Challenge
class ChallengeComment(db.Model):
    id = db.Column(db.Integer(), primary_key=True)

    challenge_instance_id = db.Column(db.Integer(), db.ForeignKey("challenge_instance.id"), nullable=False)
    challenge_instance = db.relationship('ChallengeInstance')

    comment = db.Column(db.String(500), nullable=False) #let's keep it short...

    commenter_id = db.Column(db.Integer(), db.ForeignKey("user.id"), nullable=False)
    commenter = db.relationship('User')

    date_created = db.Column(db.DateTime(), nullable=False)
    
    def __init__(self, challenge, comment, commenter):
        self.challenge_instance = challenge
        self.comment = comment
        self.commenter = commenter
        self.date_created = db.Column(db.DateTime(), nullable=False)

# Exposed schema for Challenge model
class ChallengeParticipantSchema(ma.Schema):
    class Meta:
        fields = ("id", "challenge_instance_id", "participant_id", "date_joined")

# a relationship mark for user participating in a challenge, archivable and indexed
class ChallengeParticipant(db.Model):
    id = db.Column(db.Integer(), primary_key=True)

    challenge_instance_id = db.Column(db.Integer(), db.ForeignKey("challenge_instance.id"), nullable=False)
    challenge_instance = db.relationship('ChallengeInstance')

    participant_id = db.Column(db.Integer(), db.ForeignKey("user.id"), nullable=False)
    participant = db.relationship('User')

    date_joined = db.Column(db.DateTime(), nullable=False)

    def __init__(self, challenge, participant):
        self.challenge_instance = challenge
        self.participant = participant
        self.date_joined = datetime.datetime.now()

# a relationship mark for user FOLLOWING but not actively participating in a challenge, archivable and indexed
class ChallengeFollower(db.Model):
    id = db.Column(db.Integer(), primary_key=True)
    challenge_instance_id = db.Column(db.Integer(), db.ForeignKey("challenge_instance.id"), nullable=False)
    challenge_instance = db.relationship('ChallengeInstance')
    follower_id = db.Column(db.Integer(), db.ForeignKey("user.id"), nullable=False)
    follower = db.relationship('User')
    date_joined = db.Column(db.DateTime(), nullable=False)

    def __init__(self, challenge, follower):
        self.challenge_instance = challenge
        self.follower = follower
        self.date_joined = datetime.datetime.now()

# Exposed schema for Challenge model
class ChallengeMediaSchema(ma.Schema):
    class Meta:
        fields = ("id", "challenge_id", "uri", "tooltip", "priority")

# Video / other media associated to a challenge for display in hero
# Separated as an entry in case we decide to extend later, we can adapt the front end templates without 
# major schema changes
class ChallengeMedia(db.Model):
    id = db.Column(db.Integer(), primary_key=True)

    challenge_id = db.Column(db.Integer, db.ForeignKey("challenge.id"), nullable=False)
    challenge = db.relationship('Challenge')

    uri = db.Column(db.Text(), nullable=False) # Main URI
    tooltip = db.Column(db.Text(), nullable=True) # in case you want to load up a tooltip / caption for the media
    priority = db.Column(db.Integer, nullable=False) #1 for main, otherwise >1 for a "sort order"

    def __init__(self, challenge, uri, tooltip, priority):
        self.challenge = challenge
        self.uri = uri
        self.tooltip = tooltip
        self.priority = priority
