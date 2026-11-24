import type { ReactNode } from "react";
import { StoreProvider, StoreSubnav } from "@/components/bookstore/store-provider";

export default function BookstoreLayout({ children }: { children: ReactNode }) {
  return <StoreProvider><StoreSubnav />{children}</StoreProvider>;
}
