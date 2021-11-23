import fs from "node:fs/promises";
import fetch from "node-fetch";
import QRCode from "qrcode";

(async () => {
  const students = await fetch(
    "https://api.airtable.com/v0/app0YWV5SUO56LjYR/Students%20Master%20List?view=Main%20View",
    {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      },
    }
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Bad Response: ${response.status} ${response.statusText}`
        );
      }

      return response;
    })
    .then(
      (response) =>
        response.json() as Promise<{
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
        }>
    )
    .then((data) =>
      data.records.map(({ id, fields }) => ({
        id,
        email: fields.Email,
        studentId: fields["Student ID"],
        fullName: fields["Full Name"],
      }))
    );

  await fs.mkdir("qr").catch((error) => null);

  await Promise.all(
    students
      .filter(
        (student): student is typeof student & { studentId: string } =>
          !!student.studentId
      )
      .map(async (student) => {
        await QRCode.toFile(
          `qr/${student.studentId} - ${student.fullName}.png`,
          student.studentId,
          {
            errorCorrectionLevel: "low",
          }
        );
      })
  );
})().catch((error) => {
  console.log(error);
  process.exitCode = 1;
});
