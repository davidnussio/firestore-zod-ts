import { Schema } from "effect/index";
import { getFirestore } from "firebase-admin/firestore";
import { FirebaseSchema, FirestoreDate } from "./firestore";

// Convert "on"/"off" to boolean and back
const db = getFirestore();

export const usersCollection = db.collection("users");

const NullishString = Schema.NullishOr(Schema.String);

export const AddressSchema = Schema.Struct({
  phone: NullishString,
  street2: NullishString,
  city: NullishString,
  street: NullishString,
  countryRegion: NullishString,
  postalCode: NullishString,
  stateProvince: NullishString,
});
export type Address = Schema.Schema.Type<typeof AddressSchema>;

export const TeamSchema = Schema.Struct({
  name: Schema.String,
  gid: Schema.String,
});
export type Team = Schema.Schema.Type<typeof TeamSchema>;

export const UserSchema = Schema.Struct({
  uid: Schema.String,
  acceptedMailing: Schema.NullishOr(FirestoreDate),
  emailVerified: Schema.Boolean,
  photoUrl: NullishString,
  accessLevel: Schema.Number,
  disabled: Schema.Boolean,
  email: Schema.String,
  registred: Schema.Boolean,
  acceptedTerms: Schema.Unknown,
  displayName: Schema.NullishOr(Schema.String),
});
export type User = Schema.Schema.Type<typeof UserSchema>;

export const AccountSchema = Schema.Struct({
  language: Schema.String,
  firstName: Schema.String,
  lastName: Schema.String,
  address: AddressSchema,
  phone: NullishString,
});
export type Account = Schema.Schema.Type<typeof AccountSchema>;

export const WelcomeSchema = Schema.Struct({
  createdAt: Schema.Unknown,
  account: AccountSchema,
  user: UserSchema,
  teams: Schema.Array(TeamSchema),
  teamsId: Schema.Array(Schema.String),
});
export type Welcome = Schema.Schema.Type<typeof WelcomeSchema>;

export const UserDocSchema = Schema.extend(
  FirebaseSchema,
  Schema.Struct({
    account: AccountSchema,
    user: UserSchema,
    teams: Schema.Array(TeamSchema),
    teamsId: Schema.Array(Schema.String),
    id: Schema.String,
  })
);
export type UserDocType = Schema.Schema.Type<typeof UserDocSchema>;
