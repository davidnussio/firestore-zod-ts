import "dotenv/config";
import { Effect, Schema, Stream } from "effect/index";
import {
  getAsyncGeneratorFromQuery,
  getDataFromDoc,
  getDataFromQuery,
} from "./firestore";
import {
  UserDocSchema,
  type UserDocType,
  UserSchema,
  type User,
  usersCollection,
} from "./models";
import { getDataEffect } from "./effect";

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

async function addUser(userData: User) {
  try {
    const result = Schema.decodeUnknownEither(UserSchema)(userData);
    if (result._tag === "Left") {
      throw new Error(`Validation failed: ${result.left}`);
    }
    await usersCollection.add(result.right);
  } catch (error) {
    console.error("Validation failed", error);
  }
}

async function main() {
  console.log("-----");
  let count = 0;
  for await (const user of getAsyncGeneratorFromQuery(
    usersCollection
      .where("user.accessLevel", ">=", 8)
      .orderBy("user.accessLevel", "desc"),
    UserDocSchema,
    { limit: 4, maxCount: 1000 }
  )) {
    count++;
    console.log(`${count}   <-`, user.user.email);
    if (count >= 20) {
      break;
    }
  }

  // await addUser({
  //   // uid: "test123",
  //   email: "test@example.com",
  // });

  // const users = await getUsers({ limit: 10 });
  // console.log("-----");
  // console.log("Users with age > 40:");
  // for (const user of users) {
  //   console.log("   <-", user.user);
  // }

  // const user = await getUser("3jqBrsfKtTbn5ItP54rXTN2WxOi1");
  // console.log("- User with id: 3jqBrsfKtTbn5ItP54rXTN2WxOi1");
  // console.log(user);
  // console.log("-----");
}

//main();

const program = Effect.gen(function* () {
  const startQuery = usersCollection
    .where("user.accessLevel", ">=", 8)
    .orderBy("user.accessLevel", "desc");

  const data = yield* Stream.runCollect(
    getDataEffect(startQuery, UserDocSchema).pipe(Stream.take(20))
  );

  yield* Effect.log("Data loaded from Firestore:", data.length, "documents");

  for (const user of data) {
    yield* Effect.log("User email:", user.user.email);
  }
  return data;
});

Effect.runPromise(program)
  .then((result) => {
    console.log("Program completed successfully:", result);
  })
  .catch((error) => {
    console.error("Program failed with error:", error);
  });
