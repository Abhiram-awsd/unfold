import { currentUserId } from "@/lib/data";
import Landing from "./Landing";

export default async function Home() {
  return <Landing signedIn={Boolean(await currentUserId())} />;
}
