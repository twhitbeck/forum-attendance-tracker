import { useEffect, useRef, useState } from "react";
import {
  useLoaderData,
  useNavigate,
  MetaFunction,
  LoaderFunction,
} from "remix";
import { fetchForums, Forum } from "~/lib/airtable";

export const meta: MetaFunction = () => {
  return {
    title: "Concert Attendance Tracker",
  };
};

interface LoaderData {
  forums: Forum[];
}

export const loader: LoaderFunction = async () => {
  const [forums] = await Promise.all([fetchForums()]);

  const loaderData: LoaderData = {
    forums: forums.sort((a, b) => (a.date < b.date ? 1 : -1)),
  };

  return loaderData;
};

export default function Index() {
  const { forums } = useLoaderData<LoaderData>();
  const [forumId, setForumId] = useState(
    () =>
      forums.find((forum) => {
        const now = new Date();
        const tomorrow = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1
        );

        return new Date(forum.date) < tomorrow;
      })?.id ?? ""
  );

  const navigate = useNavigate();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        if (!forumId) {
          return;
        }

        navigate(`forums/${forumId}`);
      }}
    >
      <label className="block text-sm font-medium mb-1" htmlFor="forum-select">
        Select a forum:
      </label>

      <select
        id="forum-select"
        className="max-w-full mb-2"
        value={forumId}
        onChange={(e) => {
          setForumId(e.target.value);
        }}
      >
        <option></option>

        {forums.map((forum) => (
          <option key={forum.id} value={forum.id}>
            {forum.name}
          </option>
        ))}
      </select>

      <button
        disabled={!forumId}
        className="block w-full p-4 select-none rounded text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:pointer-events-none disabled:bg-gray-300"
        type="submit"
      >
        Select
      </button>
    </form>
  );
}
