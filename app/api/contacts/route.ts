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
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/contacts/route.ts:41',message:'POST /api/contacts entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
  // #endregion
  try {
    const body = (await req.json()) as CreateContactRequest;
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/contacts/route.ts:44',message:'POST body parsed',data:{type:body.type,name:body.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion

    if (body.type === "company") {
      if (!body.name || !body.name.trim()) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/contacts/route.ts:47',message:'Company name validation failed',data:{name:body.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return NextResponse.json(
          { error: "Company name is required" },
          { status: 400 }
        );
      }
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/contacts/route.ts:52',message:'Calling createCompany',data:{name:body.name.trim()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
      // #endregion
      const company = await createCompany(body.name);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/contacts/route.ts:53',message:'createCompany succeeded',data:{companyId:company.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(company, { status: 201 });
    }

    if (body.type === "person") {
      if (!body.name || !body.name.trim()) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/contacts/route.ts:57',message:'Person name validation failed',data:{name:body.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return NextResponse.json(
          { error: "Person name is required" },
          { status: 400 }
        );
      }
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/contacts/route.ts:63',message:'Calling createPerson',data:{name:body.name.trim(),companyId:body.companyId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
      // #endregion
      const person = await createPerson(
        body.name,
        body.title,
        body.companyId
      );
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/contacts/route.ts:68',message:'createPerson succeeded',data:{personId:person.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/contacts/route.ts:93',message:'POST error caught',data:{errorMessage:error instanceof Error ? error.message : String(error),errorStack:error instanceof Error ? error.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C,D'})}).catch(()=>{});
    // #endregion
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

