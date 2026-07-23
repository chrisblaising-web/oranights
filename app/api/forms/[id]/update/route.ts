import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Update route is not implemented yet.",
    },
    {
      status: 501,
    }
  );
}