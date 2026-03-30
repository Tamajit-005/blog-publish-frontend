import { Suspense } from "react";
import SignupClient from "./client";
export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupClient />
    </Suspense>
  );
}
