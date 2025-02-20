import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPropertySchema, insertMouSchema, insertCalculatorUsageSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: function (req, file, cb) {
      cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
  })
});

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Calculator usage tracking
  app.post("/api/calculator-usage", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      console.log('Received calculator usage data:', req.body);

      const calculationData = {
        ...req.body,
        userId: req.user.id,
        propertyValue: Number(req.body.propertyValue),
        appreciationRate: Number(req.body.appreciationRate),
        requiredMonthlyAmount: Number(req.body.requiredMonthlyAmount),
        annualIncreaseRate: req.body.annualIncreaseRate ? Number(req.body.annualIncreaseRate) : null,
        blockPeriod: req.body.blockPeriod ? Number(req.body.blockPeriod) : null,
        calculationResult: req.body.calculationResult || {},
      };

      console.log('Transformed calculator data:', calculationData);

      const validation = insertCalculatorUsageSchema.safeParse(calculationData);
      if (!validation.success) {
        console.error('Validation error:', JSON.stringify(validation.error, null, 2));
        return res.status(400).json(validation.error);
      }

      const usage = await storage.trackCalculatorUsage(validation.data);
      res.status(201).json(usage);
    } catch (error) {
      console.error('Error tracking calculator usage:', error);
      res.status(500).send(error instanceof Error ? error.message : "Internal server error");
    }
  });

  // Add this route inside registerRoutes function before the httpServer creation
  app.get("/api/calculator-usage/history", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const history = await storage.getCalculatorUsageByUser(req.user.id);
      res.json(history);
    } catch (error) {
      console.error('Error fetching calculator usage history:', error);
      res.status(500).send(error instanceof Error ? error.message : "Internal server error");
    }
  });

  // Check for duplicate properties
  app.post("/api/properties/check-duplicate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { address } = req.body;
    const existingProperty = await storage.findPropertyByAddress(address);

    if (existingProperty) {
      return res.status(409).send("A property with this address already exists");
    }

    res.sendStatus(200);
  });

  // Property routes
  app.get("/api/properties", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    if (req.user.userType === "senior") {
      // Senior citizens only see their own properties
      const properties = await storage.getPropertiesByOwner(req.user.id);
      res.json(properties);
    } else {
      // Banks and builders see all available properties
      const properties = await storage.getAllProperties();
      res.json(properties);
    }
  });

  app.post(
    "/api/properties",
    upload.fields([
      { name: 'propertyDocs', maxCount: 1 },
      { name: 'encumbranceCert', maxCount: 1 }
    ]),
    async (req, res) => {
      try {
        if (!req.isAuthenticated()) {
          console.log('Authentication check failed');
          return res.sendStatus(401);
        }
        if (req.user.userType !== "senior") {
          return res.status(403).send("Only senior citizens can create properties");
        }

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        if (!files.propertyDocs || !files.encumbranceCert) {
          return res.status(400).send("Both property documents and encumbrance certificate are required");
        }

        const propertyData = {
          ...req.body,
          value: parseFloat(req.body.propertyValue),
          monthlyPayment: parseFloat(req.body.monthlyPayment),
          term: parseInt(req.body.term),
          propertyDocs: files.propertyDocs[0].path,
          encumbranceCert: files.encumbranceCert[0].path,
          ownerId: req.user.id,
          status: 'pending' as const,
        };

        console.log('Property data:', propertyData);

        const validation = insertPropertySchema.safeParse(propertyData);
        if (!validation.success) {
          console.error('Validation error:', validation.error);
          return res.status(400).json(validation.error);
        }

        const property = await storage.createProperty(validation.data);
        res.status(201).json(property);
      } catch (error) {
        console.error('Error creating property:', error);
        res.status(500).send(error instanceof Error ? error.message : "Internal server error");
      }
    }
  );

  // Update property
  app.patch("/api/properties/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const propertyId = parseInt(req.params.id);
    const property = await storage.getProperty(propertyId);

    if (!property) {
      return res.status(404).send("Property not found");
    }

    if (property.ownerId !== req.user.id) {
      return res.status(403).send("You can only edit your own properties");
    }

    // Only allow updates if property is not contracted
    if (property.status !== 'pending') {
      return res.status(403).send("Cannot edit a property that is already under contract");
    }

    const updatedProperty = await storage.updateProperty(propertyId, req.body);
    res.json(updatedProperty);
  });

  // Delete property
  app.delete("/api/properties/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const propertyId = parseInt(req.params.id);
    const property = await storage.getProperty(propertyId);

    if (!property) {
      return res.status(404).send("Property not found");
    }

    if (property.ownerId !== req.user.id) {
      return res.status(403).send("You can only delete your own properties");
    }

    // Only allow deletion if property is not contracted
    if (property.status !== 'pending') {
      return res.status(403).send("Cannot delete a property that is already under contract");
    }

    await storage.deleteProperty(propertyId);
    res.sendStatus(204);
  });

  // MOU routes
  app.get("/api/mous/:propertyId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const mous = await storage.getMousByProperty(parseInt(req.params.propertyId));
    res.json(mous);
  });

  app.post("/api/mous", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const validation = insertMouSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(validation.error);
    }
    const mou = await storage.createMou(validation.data);
    res.status(201).json(mou);
  });

  const httpServer = createServer(app);
  return httpServer;
}