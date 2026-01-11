import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  // If the env variable isn't being picked up, pass it here:
  config: {
    token: process.env.UPLOADTHING_TOKEN,
  },
});
