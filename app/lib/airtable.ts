interface PerfForum {
  id: string;
  fields: {
    "Concert Attendance"?: string[];
    "Event Description"?: string;
    "Event Date": string;
    "Forum Date": string;
    Attendees?: string[];
    "# of Performers": number;
    "Event Month": string;
    "Total Count of Attendees": number;
  };
  createdTime: string;
}

function mapPerfForum(perfForum: PerfForum): Forum {
  return {
    id: perfForum.id,
    name: perfForum.fields["Forum Date"],
    date: perfForum.fields["Event Date"],
  };
}

export async function fetchForums(): Promise<Forum[]> {
  const data = await apiFetchJson<{
    records: Array<PerfForum>;
  }>("Perf Forum");

  return data.records.map(mapPerfForum);
}

export async function fetchStudents(): Promise<Student[]> {
  const data = await apiFetchJson<{
    records: Array<{
      id: string;
      fields: {
        "First Name": string;
        "Last Name": string;
        Email: string;
        Status: string;
        "Student ID"?: string;
        "Full Name": string;
      };
    }>;
  }>("Students Master List?view=Main View");

  return data.records
    .map(({ id, fields }) => ({
      id,
      studentId: fields["Student ID"],
      email: fields.Email,
      fullName: fields["Full Name"],
    }))
    .filter(
      (student): student is typeof student & { studentId: string } =>
        !!student.studentId
    );
}

export async function fetchForum(forumId: string): Promise<Forum> {
  const data = await apiFetchJson<PerfForum>(`Perf Forum/${forumId}`);

  return mapPerfForum(data);
}

export async function fetchConcertAttendance(
  filters: {
    forumName?: string;
  } = {}
): Promise<ConcertAttendance[]> {
  let path = "Concert Attendance";

  if (filters.forumName) {
    path += `?filterByFormula={Perf Forum} = "${filters.forumName}"`;
  }

  const data = await apiFetchJson<{
    records: Array<{
      id: string;
      fields: {
        "Perf Forum"?: string[];
        "Att Taker"?: string;
        Name?: string[];
        Record?: string;
        Created: string;
      };
    }>;
  }>(path);

  return data.records.map(({ id, fields }) => ({
    id,
    forumIds: fields["Perf Forum"],
    studentIds: fields.Name,
  }));
}

async function recordAttendance(
  studentId: string,
  forumId: string
): Promise<void> {
  await apiFetch("Concert Attendance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records: [
        {
          fields: {
            "Perf Forum": [forumId],
            Name: [studentId],
            "Att Taker": "Mr. Moser",
          },
        },
      ],
    }),
  });
}

export interface Forum {
  id: string;
  name: string;
  date: string;
}

export interface Student {
  id: string;
  studentId: string;
  email: string;
  fullName: string;
}

export interface ConcertAttendance {
  id: string;
  forumIds: string[] | undefined;
  studentIds: string[] | undefined;
}

function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(`https://api.airtable.com/v0/app0YWV5SUO56LjYR/${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
    },
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(
        `Bad Response: ${response.status} ${response.statusText}`
      );
    }

    return response;
  });
}

const json = <T = any>(response: Response): Promise<T> => response.json();

const apiFetchJson = <T = any>(path: string, init?: RequestInit) =>
  apiFetch(path, init).then((response) => json<T>(response));
