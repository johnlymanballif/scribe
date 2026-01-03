import { NextResponse } from "next/server";
import {
  getAllContacts,
  createCompany,
  createPerson,
  createDictionaryEntry,
  updateCompany,
  updatePerson,
  updateDictionaryEntry,
  deleteCompany,
  deletePerson,
  deleteDictionaryEntry,
} from "@/lib/contacts/storage";
import type {
  CreateContactRequest,
  UpdateContactRequest,
  DeleteRequest,
} from "@/lib/contacts/types";

// -----------------------------------------------------------------------------
// GET /api/contacts - Get all contacts
// -----------------------------------------------------------------------------

export async function GET() {
  try {
    const data = await getAllContacts();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

// -----------------------------------------------------------------------------
// POST /api/contacts - Create a new contact
// -----------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateContactRequest;

    if (body.type === "company") {
      if (!body.name || !body.name.trim()) {
        return NextResponse.json(
          { error: "Company name is required" },
          { status: 400 }
        );
      }
      const company = await createCompany(body.name);
      return NextResponse.json(company, { status: 201 });
    }

    if (body.type === "person") {
      if (!body.name || !body.name.trim()) {
        return NextResponse.json(
          { error: "Person name is required" },
          { status: 400 }
        );
      }
      const person = await createPerson(
        body.name,
        body.title,
        body.companyId
      );
      return NextResponse.json(person, { status: 201 });
    }

    if (body.type === "dictionary") {
      if (!body.incorrect || !body.incorrect.trim()) {
        return NextResponse.json(
          { error: "Incorrect spelling is required" },
          { status: 400 }
        );
      }
      if (!body.correct || !body.correct.trim()) {
        return NextResponse.json(
          { error: "Correct spelling is required" },
          { status: 400 }
        );
      }
      const entry = await createDictionaryEntry(body.incorrect, body.correct);
      return NextResponse.json(entry, { status: 201 });
    }

    return NextResponse.json(
      { error: "Invalid contact type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error creating contact:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create contact";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// PUT /api/contacts - Update an existing contact
// -----------------------------------------------------------------------------

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as UpdateContactRequest;

    if (body.type === "company") {
      if (!body.name || !body.name.trim()) {
        return NextResponse.json(
          { error: "Company name is required" },
          { status: 400 }
        );
      }
      const company = await updateCompany(body.id, body.name);
      return NextResponse.json(company);
    }

    if (body.type === "person") {
      if (!body.name || !body.name.trim()) {
        return NextResponse.json(
          { error: "Person name is required" },
          { status: 400 }
        );
      }
      const person = await updatePerson(
        body.id,
        body.name,
        body.title,
        body.companyId
      );
      return NextResponse.json(person);
    }

    if (body.type === "dictionary") {
      if (!body.incorrect || !body.incorrect.trim()) {
        return NextResponse.json(
          { error: "Incorrect spelling is required" },
          { status: 400 }
        );
      }
      if (!body.correct || !body.correct.trim()) {
        return NextResponse.json(
          { error: "Correct spelling is required" },
          { status: 400 }
        );
      }
      const entry = await updateDictionaryEntry(
        body.id,
        body.incorrect,
        body.correct
      );
      return NextResponse.json(entry);
    }

    return NextResponse.json(
      { error: "Invalid contact type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating contact:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update contact";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// DELETE /api/contacts - Delete a contact
// -----------------------------------------------------------------------------

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as "company" | "person" | "dictionary" | null;
    const id = searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json(
        { error: "Type and id are required" },
        { status: 400 }
      );
    }

    if (type === "company") {
      await deleteCompany(id);
      return NextResponse.json({ success: true });
    }

    if (type === "person") {
      await deletePerson(id);
      return NextResponse.json({ success: true });
    }

    if (type === "dictionary") {
      await deleteDictionaryEntry(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Invalid contact type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error deleting contact:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete contact";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

