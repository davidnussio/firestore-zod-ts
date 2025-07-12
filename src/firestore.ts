import { Data, Effect, type ParseResult, Schema } from "effect/index";

export class DocumentNotFoundError extends Data.TaggedError(
  "DocumentNotFoundError"
)<{
  documentId: string;
}> {}

export function mapWithSchema<A, I = A>(schema: Schema.Schema<A, I, never>) {
  return (
    doc: FirebaseFirestore.DocumentData
  ): Effect.Effect<A, DocumentNotFoundError | ParseResult.ParseError> => {
    const data = doc.data();

    if (!data) {
      return Effect.fail(new DocumentNotFoundError({ documentId: doc.id }));
    }

    const input = {
      id: doc.id,
      createTime: doc.createTime.toDate(),
      updateTime: doc.updateTime?.toDate(),
      readTime: doc.readTime.toDate(),
      ...data,
    };

    return Schema.decodeUnknown(schema)(input);
  };
}

export async function* getAsyncGeneratorFromQuery(
  startQuery: FirebaseFirestore.Query,
  { limit = 10, maxCount = 1000 }: { limit?: number; maxCount?: number } = {}
): AsyncGenerator<FirebaseFirestore.DocumentData, void, void> {
  let count = 0;
  let lastLoadedDoc:
    | FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
    | undefined;

  function getNextQuery(
    lastLoadedDoc?: FirebaseFirestore.QueryDocumentSnapshot<
      FirebaseFirestore.DocumentData,
      FirebaseFirestore.DocumentData
    >
  ) {
    let query = startQuery.limit(limit);

    if (lastLoadedDoc) {
      query = query.startAfter(lastLoadedDoc);
    }
    return query;
  }

  while (true) {
    console.log("#####################################");
    console.log("######## Loading next batch #########");
    console.log("#####################################");
    const query = getNextQuery(lastLoadedDoc);
    const snapshot = await query.get().catch((error) => {
      throw new Error(`Error fetching data from Firestore: ${error.message}`);
    });
    lastLoadedDoc = snapshot.docs[snapshot.docs.length - 1];

    const data = snapshot.docs;

    count += data.length;

    if (data.length === 0 || count >= maxCount) {
      break;
    }

    for (const user of data) {
      console.log(`  #### yield data from async generator ${user.id}}`);
      yield user;
    }
  }
}
