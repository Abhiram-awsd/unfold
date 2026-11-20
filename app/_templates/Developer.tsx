import { getActivity, sampleActivity } from "@/lib/github";
import { githubUser } from "@/lib/links";
import { SAMPLE_ID } from "@/lib/sample-resume";
import { DeveloperView } from "./DeveloperView";
import type { TemplateProps } from "./shared";

/**
 * Developer: server part. Finds a GitHub profile in the resume's links and loads its public
 * contribution calendar (cached for a day). Previews use clearly labelled sample activity.
 */
export async function Developer({ p }: TemplateProps) {
  const user = githubUser(p.links);
  const activity = p.id === SAMPLE_ID ? sampleActivity() : user ? await getActivity(user) : null;
  return <DeveloperView p={p} activity={activity} />;
}
