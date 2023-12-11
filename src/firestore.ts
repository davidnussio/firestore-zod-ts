import { getApps, initializeApp } from "firebase-admin/app";
import { z } from "zod";

// Skip initialization if already initialized and hot-reloading problems
if (getApps().length === 0) {
  initializeApp({
    projectId: process.env.PROJECT_ID,
  });
}

export const FirebaseSchema = z.object({
  id: z.string(),
  createTime: z.date(),
  updateTime: z.date(),
  readTime: z.date(),
});

export async function getDataFromDoc<T>(
  documentRef: FirebaseFirestore.DocumentReference,
  schema: z.ZodType<T>
) {
  const doc = await documentRef.get();
  const data = mapWithSchema(schema)(doc);
  return data;
}
export async function getDataFromQuery<T>(
  query: FirebaseFirestore.Query,
  schema: z.ZodType<T>
) {
  const snapshot = await query.get();
  const data = snapshot.docs.map(mapWithSchema(schema));
  return data;
}

export function mapWithSchema<T>(schema: z.ZodType<T>) {
  return (doc: FirebaseFirestore.DocumentData): T => {
    const data = doc.data();

    return schema.parse({
      id: doc.id,
      createTime: doc.createTime.toDate(),
      updateTime: doc.updateTime?.toDate(),
      readTime: doc.readTime.toDate(),
      ...data,
    });
  };
}

export async function* getAsycGeneratorFromQuery<T>(
  startQuery: FirebaseFirestore.Query,
  schema: z.ZodType<T>,
  { limit = 10, maxCount = 1000 }: { limit?: number; maxCount?: number } = {}
): AsyncGenerator<T, void, void> {
  let count = 0;
  let data = [];
  let lastLoadedDoc = undefined;

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
    const query = getNextQuery(lastLoadedDoc);
    const snapshot = await query.get();
    lastLoadedDoc = snapshot.docs[snapshot.docs.length - 1];
    data = snapshot.docs.map(mapWithSchema(schema));

    count += data.length;

    if (data.length === 0 || count >= maxCount) {
      break;
    }

    for (const user of data) {
      yield user;
    }
  }
}
