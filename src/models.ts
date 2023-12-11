import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { FirebaseSchema } from "./firestore";

const db = getFirestore();

export const usersCollection = db.collection("users");

export const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().optional(),
});
export type UserType = z.infer<typeof UserSchema>;

export const UserDocSchema = UserSchema.merge(FirebaseSchema);
export type UserDocType = z.infer<typeof UserDocSchema>;
