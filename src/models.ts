import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { FirebaseSchema } from "./firestore";

const db = getFirestore();

export const usersCollection = db.collection("users");

export const AddressSchema = z.object({
  phone: z.string().optional(),
  street2: z.string().optional(),
  city: z.string().optional(),
  street: z.string().optional(),
  countryRegion: z.string().optional(),
  postalCode: z.string().optional(),
  stateProvince: z.string().optional(),
});
export type Address = z.infer<typeof AddressSchema>;

export const TeamSchema = z.object({
  name: z.string().optional(),
  gid: z.string().optional(),
});
export type Team = z.infer<typeof TeamSchema>;

export const UserSchema = z.object({
  uid: z.string().optional(),
  acceptedMailing: z.null().optional(),
  emailVerified: z.boolean().optional(),
  photoUrl: z.null().optional(),
  accessLevel: z.number().optional(),
  disabled: z.boolean().optional(),
  email: z.string().optional(),
  registred: z.boolean().optional(),
  acceptedTerms: z.unknown().optional(),
  displayName: z.string().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const AccountSchema = z.object({
  language: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  address: AddressSchema.optional(),
  phone: z.string().optional(),
});
export type Account = z.infer<typeof AccountSchema>;

export const WelcomeSchema = z.object({
  createdAt: z.unknown().optional(),
  account: AccountSchema.optional(),
  user: UserSchema.optional(),
  teams: z.array(TeamSchema).optional(),
  teamsId: z.array(z.string()).optional(),
});
export type Welcome = z.infer<typeof WelcomeSchema>;

export const UserDocSchema = WelcomeSchema.merge(FirebaseSchema);
export type UserDocType = z.infer<typeof UserDocSchema>;
