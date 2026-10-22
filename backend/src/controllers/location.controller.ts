import type { FastifyReply, FastifyRequest } from "fastify";
import { validate } from "../lib/validate.js";
import { sendSuccess } from "../lib/response.js";
import { getActor } from "../lib/context.js";
import { locationService } from "../services/location.service.js";
import {
  locationIdParamSchema,
  createLocationSchema,
  updateLocationSchema,
  locationStatusSchema,
  assignUserLocationSchema,
} from "../validations/location.validation.js";
import type { ListLocationsQuery } from "../types/location.types.js";

export const locationController = {
  async listLocations(request: FastifyRequest, reply: FastifyReply) {
    const locations = await locationService.listLocations(
      getActor(request),
      request.query as ListLocationsQuery
    );
    return sendSuccess(request, reply, locations);
  },

  async createLocation(request: FastifyRequest, reply: FastifyReply) {
    const actor = getActor(request);
    const data = validate(createLocationSchema, request.body);
    const result = await locationService.createLocation(actor, data);
    return sendSuccess(request, reply, result, 201);
  },

  async getLocation(request: FastifyRequest, reply: FastifyReply) {
    const actor = getActor(request);
    const { id } = validate(locationIdParamSchema, request.params);
    const loc = await locationService.getLocation(actor, id);
    return sendSuccess(request, reply, loc);
  },

  async updateLocation(request: FastifyRequest, reply: FastifyReply) {
    const actor = getActor(request);
    const { id } = validate(locationIdParamSchema, request.params);
    // Lookup and permission check intentionally run before body validation
    const existing = await locationService.getUpdatableLocation(actor, id);
    const data = validate(updateLocationSchema, request.body);
    const updated = await locationService.updateLocation(actor, existing, data);
    return sendSuccess(request, reply, updated);
  },

  async updateLocationStatus(request: FastifyRequest, reply: FastifyReply) {
    const actor = getActor(request);
    const { id } = validate(locationIdParamSchema, request.params);
    const data = validate(locationStatusSchema, request.body, "Invalid status parameter");
    const updated = await locationService.updateLocationStatus(actor, id, data);
    return sendSuccess(request, reply, updated);
  },

  async assignUser(request: FastifyRequest, reply: FastifyReply) {
    const actor = getActor(request);
    const { id } = validate(locationIdParamSchema, request.params);
    const data = validate(assignUserLocationSchema, request.body);
    const assignment = await locationService.assignUser(actor, id, data);
    return sendSuccess(request, reply, assignment);
  },

  async getLocationStats(request: FastifyRequest, reply: FastifyReply) {
    const { id } = validate(locationIdParamSchema, request.params);
    const stats = await locationService.getLocationStats(id);
    return sendSuccess(request, reply, stats);
  },
};
