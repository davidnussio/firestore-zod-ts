import { Schema } from "effect/index";
import { FirestoreDate } from "../firebase";

const NullishString = Schema.NullishOr(Schema.String);

export class AddressSchema extends Schema.Class<AddressSchema>("AddressSchema")(
  {
    phone: NullishString,
    street2: NullishString,
    city: NullishString,
    street: NullishString,
    countryRegion: NullishString,
    postalCode: NullishString,
    stateProvince: NullishString,
  }
) {}
export type Address = typeof AddressSchema.Type;

export class TeamSchema extends Schema.Class<TeamSchema>("TeamSchema")({
  name: Schema.String,
  gid: Schema.String,
}) {}
export type Team = typeof TeamSchema.Type;

export class AccountSchema extends Schema.Class<AccountSchema>("AccountSchema")(
  {
    language: Schema.String,
    firstName: Schema.String,
    lastName: Schema.String,
    address: AddressSchema,
    phone: NullishString,
  }
) {}
export type Account = typeof AccountSchema.Type;

export class UserDetailSchema extends Schema.Class<UserDetailSchema>(
  "UserDetailSchema"
)({
  uid: Schema.String,
  acceptedMailing: Schema.NullOr(Schema.Unknown),
  emailVerified: Schema.Boolean,
  photoUrl: NullishString,
  accessLevel: Schema.Number,
  disabled: Schema.Boolean,
  email: Schema.String,
  registred: Schema.Boolean,
  acceptedTerms: Schema.Unknown,
  displayName: Schema.NullishOr(Schema.String),
}) {}
export type UserDetail = typeof UserDetailSchema.Type;

export const UserSchema = Schema.Struct({
  id: Schema.optional(Schema.String),
  user: UserDetailSchema,
  account: AccountSchema,
  createdAt: FirestoreDate,
  teams: Schema.Array(TeamSchema),
  teamsId: Schema.Array(Schema.String),
});

export type User = typeof UserSchema.Type;
