import express from "express";
import { and, ilike, or, sql, eq, getTableColumns, desc } from "drizzle-orm";
import { subjects } from "../db/schema/app.js";
import { departments } from "../db/schema/app.js";
import { db } from "../db/index.js";

const router = express.Router();

// Ensure JSON body is parsed for this router (in case app-level middleware runs after mount)
router.use(express.json());

router.post("/", async (req, res) => {
  try {
    const body = req.body ?? {};
    const payload =
      body && typeof body === "object" && (body.data ?? body.variables ?? body);
    const data = payload && typeof payload === "object" ? payload : body;
    const {
      departmentId,
      name,
      code,
      description,
    } = typeof data === "object" && data !== null ? data : {};

    if (
      departmentId == null ||
      typeof name !== "string" ||
      !name.trim() ||
      typeof code !== "string" ||
      !code.trim()
    ) {
      console.warn("POST /subjects 400: body=%j content-type=%s", req.body, req.get("content-type"));
      return res.status(400).json({
        error: "departmentId, name and code are required",
      });
    }

    const [created] = await db
      .insert(subjects)
      .values({
        departmentId: Number(departmentId),
        name: name.trim(),
        code: code.trim(),
        description:
          typeof description === "string" && description.trim()
            ? description.trim()
            : null,
      })
      .returning();

    if (!created) {
      return res.status(500).json({ error: "Failed to create subject" });
    }

    res.status(201).json({ data: created });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("unique") || message.includes("duplicate")) {
      return res.status(409).json({ error: "Subject with this code already exists" });
    }
    console.error("POST /subjects error:", e);
    res.status(500).json({ error: "Failed to create subject" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { search, department, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPage = Math.min(
      Math.max(1, parseInt(String(limit), 10) || 10),
      100,
    );

    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    if (search) {
      filterConditions.push(
        or(
          ilike(subjects.name, `${search}%`),
          ilike(subjects.code, `${search}%`),
        ),
      );
    }

    if (department) {
      const deptPattern = `%${String(department).replace(/[%_]/g, "\\$&")}%`;
      filterConditions.push(ilike(departments.name, deptPattern));
    }

    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClause);

    const totalCount = countResult[0]?.count ?? 0;

    const subjectsList = await db
      .select({
        ...getTableColumns(subjects),
        department: { ...getTableColumns(departments) },
      })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClause)
      .orderBy(desc(subjects.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: subjectsList,
      pagination: {
        total: totalCount,
        page: currentPage,
        limit: limitPerPage,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (e) {
    console.error(`Get /subjects error: ${e}`);
    res.status(500).json({ error: "Faild to get subjects" });
  }
});

export default router;
