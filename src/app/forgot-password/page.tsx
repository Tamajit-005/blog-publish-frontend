import { Suspense } from "react";
import ForgotPasswordClient from "./client";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ForgotPasswordClient />
    </Suspense>
  );
}