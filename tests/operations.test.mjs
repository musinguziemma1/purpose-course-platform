import assert from "node:assert/strict";
import { test } from "node:test";
import { publicOrigin } from "../src/lib/site-url.ts";
import { authorizeJob } from "../src/lib/job-auth.ts";
test("public URLs use the configured launch domain and reject credentials or non-origin values", () => {
  assert.equal(publicOrigin({APP_URL:"https://academy.example/"}),"https://academy.example");
  assert.equal(publicOrigin({VERCEL_PROJECT_PRODUCTION_URL:"project.vercel.app"}),"https://project.vercel.app");
  assert.equal(publicOrigin({}),"http://localhost:3000");
  for(const APP_URL of ["https://user:password@example.org","https://example.org/path","https://example.org/?key=value","http://example.org","javascript:alert(1)"])assert.throws(()=>publicOrigin({APP_URL}));
});
test("scheduled handlers require the configured bearer secret rather than a spoofable scheduler user-agent", () => {
  const previous=process.env.CRON_SECRET;
  try{delete process.env.CRON_SECRET;assert.equal(authorizeJob(new Request("https://example.org")),false);process.env.CRON_SECRET="x".repeat(32);
    assert.equal(authorizeJob(new Request("https://example.org",{headers:{"user-agent":"vercel-cron/1.0"}})),false);
    assert.equal(authorizeJob(new Request("https://example.org",{headers:{authorization:"Bearer "+"y".repeat(32)}})),false);
    assert.equal(authorizeJob(new Request("https://example.org",{headers:{authorization:"Bearer "+"x".repeat(32)}})),true);
  }finally{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;}
});
