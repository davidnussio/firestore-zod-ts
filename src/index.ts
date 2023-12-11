import "dotenv/config";
import { z } from "zod";
import { faker } from "@faker-js/faker";
import {
  FirebaseSchema,
  getAsycGeneratorFromQuery,
  getDataFromDoc,
  getDataFromQuery,
  mapWithSchema,
} from "./firestore";
import {
  UserDocSchema,
  UserDocType,
  UserSchema,
  UserType,
  usersCollection,
} from "./models";

async function getUsers({
  limit = 10,
}: {
  limit: number;
}): Promise<UserDocType[]> {
  return getDataFromQuery(
    usersCollection.where("age", ">", 40).limit(limit),
    UserDocSchema
  );
}

async function getUser(id: string) {
  return getDataFromDoc(usersCollection.doc(id), UserDocSchema);
}

async function addUser(userData: UserType) {
  try {
    const parsedData = UserSchema.parse(userData);
    await usersCollection.add(parsedData);
  } catch (error) {
    console.error("Validation failed", error);
  }
}

async function main() {
  console.log("-----");
  // for await (const user of getAsycGeneratorFromQuery(
  //   usersCollection.where("age", ">=", 44).orderBy("age", "desc"),
  //   UserDocSchema,
  //   { limit: 10, maxCount: 1000 }
  // )) {
  //   console.log("   <-", user.age, user.name);
  // }
  // const users = await getUsers({ limit: 10 });
  // console.log(`- Users: ${users.length}`);
  // users.forEach((user) => console.log(user.age, user.email));
  // console.log("-----");
  const user = await getUser("c4w0vyEz1g8kUK20OnWT");
  console.log("- User with id: c4w0vyEz1g8kUK20OnWT");
  console.log(user);
  // console.log("-----");
  // for (let i = 0; i < 33; i++) {
  //   await addUser({
  //     name: faker.person.fullName(),
  //     email: faker.internet.email(),
  //     age: faker.number.int({ min: 18, max: 100 }),
  //   });
  // }
}

main();
