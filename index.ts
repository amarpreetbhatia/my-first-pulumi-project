import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";

//Get configuration values
const config = new pulumi.Config();
const frontendPort = config.requireNumber("frontendPort");
const backendPort = config.requireNumber("backendPort");
const mongoPort = config.requireNumber("mongoPort");

const stack = pulumi.getStack();

const backendImage = "backend";
const backend = new docker.RemoteImage(`${backendImage}Image`, {
  name: "pulumi/tutorial-pulumi-fundamentals-backend:latest",
});

const frontendImage = "frontend";
const frontend = new docker.RemoteImage(`${frontendImage}`, {
  name: "pulumi/tutorial-pulumi-fundamentals-frontend:latest",
});

const mongoImage = "mongoImage";
const mongo = new docker.RemoteImage(`${mongoImage}`, {
  name: "pulumi/tutorial-pulumi-fundamentals-database:latest",
});

// Create a Docker network
const network = new docker.Network("network", {
  name: `services-${stack}`,
});

const mongoHost = config.require("mongoHost"); // Note that strings are the default, so it's not `config.requireString`, just `config.require`.
const database = config.require("database");
const nodeEnvironment = config.require("nodeEnvironment");
const protocol = config.require("protocol");

// Create the MongoDB container
const mongoContainer = new docker.Container("mongoContainer", {
  image: mongo.repoDigest,
  name: `mongo-${stack}`,
  ports: [
    {
      internal: mongoPort,
      external: mongoPort,
    },
  ],
  networksAdvanced: [
    {
      name: network.name,
      aliases: ["mongo"],
    },
  ],
});

// Create the frontend container
const frontendContainer = new docker.Container("frontendContainer", {
  image: frontend.repoDigest,
  name: `frontend-${stack}`,
  ports: [
    {
      internal: frontendPort,
      external: frontendPort,
    },
  ],
  envs: [
    `PORT=${frontendPort}`,
    `HTTP_PROXY=backend-${stack}:${backendPort}`,
    `PROXY_PROTOCOL=${protocol}`,
  ],
  networksAdvanced: [
    {
      name: network.name,
    },
  ],
});

// Create the backend container
const backendContainer = new docker.Container(
  "backendContainer",
  {
    name: `backend-${stack}`,
    image: backend.repoDigest,
    ports: [
      {
        internal: backendPort,
        external: backendPort,
      },
    ],
    envs: [
      `DATABASE_HOST=${mongoHost}`,
      `DATABASE_NAME=${database}`,
      `NODE_ENV=${nodeEnvironment}`,
    ],
    networksAdvanced: [
      {
        name: network.name,
      },
    ],
  },
  { dependsOn: [mongoContainer] }
);
