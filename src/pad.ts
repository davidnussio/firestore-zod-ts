import { Schema } from "effect/index";

const Decoder = Schema.Struct({
  id: Schema.String,
  createTime: Schema.Date,
});

type DecoderType = typeof Decoder.Type;

const obj: DecoderType = {
  id: "123",
  createTime: new Date(),
};

console.log("Decoded object:", obj);
console.log("Schema encode:", Schema.encodeUnknownSync(Decoder)(obj));

type EncodedType = typeof Decoder.Encoded;

const obj2: EncodedType = {
  id: "123",
  createTime: new Date().toISOString(), // Assuming the date is serialized as an ISO string
};
console.log("Encoded object:", obj2);
console.log("Schema decode:", Schema.decodeUnknownSync(Decoder)(obj2));
