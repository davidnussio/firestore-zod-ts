import { Schema } from "effect/index";



export async function getDataFromDoc<A, I = A, R = never>(
  documentRef: FirebaseFirestore.DocumentReference,
  schema: Schema.Schema<A, I, R>
): Promise<A> {
  const doc = await documentRef.get();
  const data = mapWithSchema(schema)(doc);
  return data;
}
export async function getDataFromQuery<A, I = A, R = never>(
  query: FirebaseFirestore.Query,
  schema: Schema.Schema<A, I, R>
) {
  const snapshot = await query.get();
  const data = snapshot.docs.map(mapWithSchema(schema));
  return data;
}

export function mapWithSchema<A, I = A, R = never>(
  schema: Schema.Schema<A, I, R>
) {
  return (doc: FirebaseFirestore.DocumentData): A => {
    const data = doc.data();

    if (!data) {
      throw new Error(`Document with id ${doc.id} has no data`);
    }

    const input = {
      id: doc.id,
      createTime: doc.createTime.toDate(),
      updateTime: doc.updateTime?.toDate(),
      readTime: doc.readTime.toDate(),
      ...data,
    };

    const result = Schema.decodeUnknownEither(
      schema as Schema.Schema<A, I, never>
    )(input);
    if (result._tag === "Left") {
      throw new Error(`Schema validation failed: ${result.left}`);
    }
    return result.right;
  };
}

export async function* getAsyncGeneratorFromQuery<A, I = A, R = never>(
  startQuery: FirebaseFirestore.Query,
  schema: Schema.Schema<A, I, R>,
  { limit = 10, maxCount = 1000 }: { limit?: number; maxCount?: number } = {}
): AsyncGenerator<A, void, void> {
  let count = 0;
  let data: A[] = [];
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
    data = snapshot.docs.map(mapWithSchema(schema));

    count += data.length;

    if (data.length === 0 || count >= maxCount) {
      break;
    }

    for (const user of data) {
      console.log("  *");
      yield user;
    }
  }
}
