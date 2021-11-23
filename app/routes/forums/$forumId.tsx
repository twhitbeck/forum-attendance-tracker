import {
  useLoaderData,
  Link,
  LoaderFunction,
  MetaFunction,
  ActionFunction,
  useSubmit,
  useTransition,
} from "remix";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  fetchStudents,
  fetchForum,
  fetchConcertAttendance,
  Student,
  Forum,
  ConcertAttendance,
} from "~/lib/airtable";

export const meta: MetaFunction = () => {
  return {
    title: "Concert Attendance Tracker",
  };
};

interface LoaderData {
  students: Student[];
  forum: Forum;
  concertAttendance: ConcertAttendance[];
}

export const loader: LoaderFunction = async ({ params }) => {
  const forum = await fetchForum(params.forumId!);

  const [students, concertAttendance] = await Promise.all([
    fetchStudents(),
    fetchConcertAttendance({ forumName: forum.name }),
  ]);

  const loaderData: LoaderData = {
    students,
    forum,
    concertAttendance,
  };

  return loaderData;
};

export const action: ActionFunction = async ({ params, request }) => {
  const body = await request.formData();

  const { forumId, studentId } = Object.fromEntries(body);

  console.log(forumId, studentId);

  await new Promise((resolve) => {
    setTimeout(resolve, 2000);
  });

  return null;
};

export default function ForumRoute() {
  const { students, forum, concertAttendance } = useLoaderData<LoaderData>();

  const videoRef = useRef<HTMLVideoElement>(null!);
  const [detecting, setDetecting] = useState(false);
  const [detectedStudent, setDetectedStudent] = useState<Student | null>(null);

  const isAttendanceAlreadyRecorded = useMemo(
    () =>
      concertAttendance.some(
        (attendance) =>
          detectedStudent && attendance.studentIds?.includes(detectedStudent.id)
      ),
    [concertAttendance, detectedStudent]
  );

  const submit = useSubmit();

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "environment" },
      })
      .then((mediaStream) => {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.autoplay = true;

        setDetecting(true);
      });
  }, []);

  useEffect(() => {
    if (!detecting) {
      return;
    }

    const detector = new BarcodeDetector({ formats: ["qr_code"] });

    (function detect() {
      requestAnimationFrame(detect);

      detector
        .detect(videoRef.current)
        .then(([barcode]: Array<{ rawValue: string }>) => {
          if (!barcode) {
            return;
          }

          setDetectedStudent(
            students.find(({ studentId }) => studentId === barcode.rawValue) ??
              null
          );
        });
    })();
  }, [detecting, students]);

  const transition = useTransition();

  return (
    <>
      <p className="mb-2 text-sm font-medium">
        {forum.name}
        &nbsp;-&nbsp;
        <Link className="text-blue-600 hover:text-blue-700" to="/">
          Go back
        </Link>
      </p>

      <video className="aspect-square mb-4" ref={videoRef} />

      {detectedStudent ? (
        isAttendanceAlreadyRecorded ? (
          <span>{`Attendance already recorded for ${detectedStudent.fullName}`}</span>
        ) : (
          <button
            className="block w-full p-4 select-none rounded text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:pointer-events-none disabled:bg-gray-300"
            onClick={(e) => {
              submit(
                { forumId: forum.id, studentId: detectedStudent.id },
                { method: "post" }
              );
            }}
            disabled={!!transition.submission}
          >
            {transition.submission
              ? "Recording attendance for"
              : "Record attendance for"}
            <br />
            <b>{detectedStudent.fullName}</b>
          </button>
        )
      ) : null}
    </>
  );
}
