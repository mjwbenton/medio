import { ApolloServer } from "@apollo/server";
import {
  handlers,
  startServerAndCreateLambdaHandler,
} from "@as-integrations/aws-lambda";
import { Resolvers } from "./generated/graphql";
import { buildSubgraphSchema } from "@apollo/subgraph";
import gql from "graphql-tag";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { cleanEnv, str } from "envalid";

const { BUCKET } = cleanEnv(process.env, {
  BUCKET: str(),
});

const CDN_DOMAIN = "https://recordings.medio.mattb.tech";

const S3 = new S3Client({});

const typeDefs = gql`
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.0"
      import: ["@key", "@shareable"]
    )

  extend type Query {
    recordings: [Recording!]!
  }

  type Recording {
    url: String!
  }
`;

const resolvers: Resolvers = {
  Query: {
    recordings: async () => {
      const objectsList = await S3.send(
        new ListObjectsV2Command({ Bucket: BUCKET }),
      );
      return (
        objectsList.Contents?.map((object) => ({
          url: `${CDN_DOMAIN}/${object.Key}`,
        })) ?? []
      );
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({
    typeDefs,
    resolvers,
  }),
});

export const handler = startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventV2RequestHandler(),
);
