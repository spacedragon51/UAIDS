import { Router, type IRouter } from "express";
import { store, type ResumeRow } from "../lib/store.js";
import { buildBiasReport } from "../lib/biasReport.js";

const router: IRouter = Router();

const SAMPLE_ROWS: Array<[string, string, number, number]> = [
  ["James Smith", "Senior software engineer with 8 years of experience. He led a team of 6 building scalable cloud infrastructure on AWS. He architected microservices, improved deployment pipelines, and reduced incidents by 40%.", 2018, 1],
  ["Mary Johnson", "Product designer specializing in user research. She conducted 50+ usability studies, designed mobile apps used by 2M users, and collaborated with engineering and marketing teams.", 2019, 1],
  ["Robert Brown", "Data scientist with strong background in statistics. He built ML models for fraud detection, deployed Python pipelines, and mentored junior analysts in feature engineering.", 2010, 1],
  ["Patricia Davis", "Marketing manager. She launched campaigns across social media, increased engagement by 35%, and managed a team of three content creators.", 2017, 0],
  ["Wei Zhang", "Machine learning researcher. He published two NeurIPS papers, built distributed training systems, and optimized neural networks for production inference.", 2016, 1],
  ["Mei Li", "Frontend engineer. She created a design system used across 12 products, improved Lighthouse scores from 60 to 95, and worked closely with designers.", 2020, 1],
  ["Hiroshi Tanaka", "Backend engineer. He developed gRPC services, optimized database queries, and supported a platform handling 1B daily requests.", 2014, 1],
  ["Priya Patel", "Product analyst. She analyzed funnel data, A/B tested features, and reported to leadership weekly. She drives data-informed decisions across teams.", 2021, 0],
  ["Carlos Hernandez", "DevOps engineer. He automated CI/CD pipelines, migrated workloads to Kubernetes, and built monitoring dashboards using Prometheus.", 2015, 1],
  ["Maria Gonzalez", "QA lead. She wrote automation in Cypress, managed regression suites, and partnered with developers on shift-left testing.", 2013, 0],
  ["Juan Rodriguez", "Sales engineer. He delivered technical demos to enterprise prospects, supported 30+ deals worth $20M, and trained the SDR team on integrations.", 2012, 1],
  ["Sofia Lopez", "UX researcher. She ran ethnographic studies, synthesized insights, and partnered with product to translate findings into roadmap.", 2022, 0],
  ["Kwame Mensah", "Software engineer. He built recommendation systems, improved click-through rate by 22%, and presented results to stakeholders.", 2019, 1],
  ["Aisha Hassan", "Data engineer. She designed Spark pipelines, owned the data warehouse, and collaborated with analytics on metric definitions.", 2018, 1],
  ["Ahmed Mohamed", "Cybersecurity specialist. He hardened cloud workloads, ran red team exercises, and trained engineering teams on secure coding.", 2011, 1],
  ["Fatima Ali", "Project manager. She coordinated cross-functional launches, tracked OKRs, and ran weekly stand-ups for distributed teams.", 2008, 0],
  ["John Wilson", "Engineering manager. He grew his team from 4 to 12, built career ladders, and partnered with product on quarterly planning.", 1995, 0],
  ["Linda Anderson", "Customer success manager. She reduced churn by 18%, ran QBRs with strategic accounts, and authored the customer onboarding playbook.", 1998, 0],
  ["Olivia Taylor", "Software engineer intern. She implemented features in React, fixed bugs reported by QA, and shipped two small projects to production.", 2024, 1],
  ["David Miller", "Staff engineer. He designed the platform architecture, mentored seven engineers, and authored the team's RFC process.", 1992, 0],
  ["Jennifer Moore", "Senior product manager. She owned the analytics product, prioritized the roadmap, and partnered with design and engineering on launches.", 2009, 1],
  ["Michael Garcia", "Solutions architect. He designed integration patterns for Fortune 500 customers, ran workshops, and authored reference architectures.", 2007, 1],
  ["Sarah Martinez", "Recruiter. She filled 40 engineering roles in 12 months, built sourcing pipelines, and coached hiring managers on inclusive interviewing.", 2016, 0],
  ["Daniel Lee", "iOS engineer. He shipped six features, reduced crash rate to under 0.05%, and led the migration to Swift Concurrency.", 2017, 1],
  ["Emily Chen", "ML engineer. She built training pipelines on GCP, optimized inference latency, and shipped two models to production.", 2020, 1],
  ["Joseph Walker", "Sales operations. He owned territory planning, built dashboards in Salesforce, and partnered with finance on quota setting.", 2003, 0],
  ["Helen Hall", "Technical writer. She authored API documentation, ran developer experience research, and improved time-to-first-API-call by 40%.", 2002, 0],
  ["Hassan Al-Rashid", "Cloud engineer. He built Terraform modules, automated security scanning, and wrote runbooks for the on-call rotation.", 2013, 1],
  ["Anjali Sharma", "Engineering manager. She led a team of 8, ran sprint planning, and partnered with product on quarterly roadmaps.", 2010, 1],
  ["Sandra Lewis", "Senior data analyst. She built executive dashboards, analyzed retention cohorts, and presented insights to the leadership team.", 2014, 1],
  ["Anthony Young", "Network engineer. He designed the corporate WAN, automated configuration with Ansible, and mentored junior engineers.", 1996, 0],
];

router.post("/seed-sample", (_req, res) => {
  const rows: ResumeRow[] = SAMPLE_ROWS.map(([name, resume_text, gy, label]) => ({
    name,
    resume_text,
    graduation_year: gy,
    label,
  }));
  store.rawRows = rows;
  store.processed = [];
  store.preprocessSummary = null;
  store.model = null;
  store.predictionBuffer = [];
  const biasReport = buildBiasReport(rows);
  store.biasReport = biasReport;
  res.json({
    success: true,
    filename: "fairhire-sample.csv",
    rows_loaded: rows.length,
    bias_report: biasReport,
  });
});

router.get("/sample-dataset.csv", (_req, res) => {
  const header = "name,resume_text,graduation_year,label";
  const rows = SAMPLE_ROWS.map(([name, text, gy, label]) => {
    const safe = `"${text.replace(/"/g, '""')}"`;
    return `${name},${safe},${gy},${label}`;
  });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="fairhire-sample.csv"');
  res.send([header, ...rows].join("\n"));
});

export default router;
