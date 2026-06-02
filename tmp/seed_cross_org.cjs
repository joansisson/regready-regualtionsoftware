const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const db = new Database("local.db");

const seedUser = (email, username, organizationId) => {
  const password = "placeholder-password";
  const passwordHash = bcrypt.hashSync(password, 12);

  const existingRow = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existingRow?.id) {
    db.prepare(
      "UPDATE users SET password = ?, organization_id = ?, username = ?, role = ?, llm_provider = ? WHERE id = ?",
    ).run(
      passwordHash,
      organizationId,
      username,
      "admin",
      "gemini",
      existingRow.id,
    );
    return existingRow.id;
  }

  const result = db
    .prepare(
      `
      INSERT INTO users (
        email,
        password,
        username,
        company_name,
        organization_id,
        role,
        llm_provider,
        openai_api_key_encrypted,
        openai_api_key_last4,
        openai_api_key_validated_at,
        gemini_api_key_encrypted,
        gemini_api_key_last4,
        gemini_api_key_validated_at
      ) VALUES (
        @email,
        @password,
        @username,
        @company_name,
        @organization_id,
        @role,
        @llm_provider,
        @openai_api_key_encrypted,
        @openai_api_key_last4,
        @openai_api_key_validated_at,
        @gemini_api_key_encrypted,
        @gemini_api_key_last4,
        @gemini_api_key_validated_at
      )
    `
    )
    .run({
      email,
      password: passwordHash,
      username,
      company_name: null,
      organization_id: organizationId,
      role: "admin",
      llm_provider: "gemini",
      openai_api_key_encrypted: null,
      openai_api_key_last4: null,
      openai_api_key_validated_at: null,
      gemini_api_key_encrypted: null,
      gemini_api_key_last4: null,
      gemini_api_key_validated_at: null,
    });

  return Number(result.lastInsertRowid);
};

const org2UserEmail = "org2-smoke@regready.local";
const org2UserUsername = "Org2 Smoke";
const org3UserEmail = "org3-smoke@regready.local";
const org3UserUsername = "Org3 Smoke";
const org2PolicyTitle = "Org2 CrossOrg Denial Policy";

const ensureOrg2User = () => seedUser(org2UserEmail, org2UserUsername, 2);

const ensureOrg2Policy = () => {
  const existingRow = db
    .prepare("SELECT id FROM policies WHERE organization_id = 2 AND title = ?")
    .get(org2PolicyTitle);

  if (existingRow?.id) return existingRow.id;

  const inserted = db
    .prepare(
      `
      INSERT INTO policies (
        title,
        type,
        description,
        content,
        version,
        status,
        frameworks,
        created_by,
        approved_by,
        organization_id
      ) VALUES (
        @title,
        @type,
        @description,
        @content,
        @version,
        @status,
        @frameworks,
        @created_by,
        @approved_by,
        @organization_id
      )
    `
    )
    .run({
      title: org2PolicyTitle,
      type: "general",
      description: "Seeded for cross-org access denial test.",
      content: "Seeded policy content.",
      version: "1.0",
      status: "approved",
      frameworks: JSON.stringify(["gdpr"]),
      created_by: "Smoke Seeder",
      approved_by: "Smoke Seeder",
      organization_id: 2,
    });

  return Number(inserted.lastInsertRowid);
};

const org2UserId = ensureOrg2User();
const org2PolicyId = ensureOrg2Policy();
const org3UserId = seedUser(org3UserEmail, org3UserUsername, 3);

console.log(
  JSON.stringify({
    org2UserEmail,
    org2UserId,
    org2PolicyId,
    orgIdOrg2: 2,
    org3UserEmail,
    org3UserId,
    orgIdOrg3: 3,
  })
);
