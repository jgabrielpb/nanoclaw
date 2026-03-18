import { HaServiceCatalog, HaServiceDefinition } from './types.js';

interface RawServiceDomain {
  domain: string;
  services: Record<string, { description?: string; fields?: Record<string, unknown> }>;
}

export function buildServiceCatalog(rawDomains: RawServiceDomain[]): HaServiceCatalog {
  const domains: Record<string, HaServiceDefinition[]> = {};

  for (const rawDomain of rawDomains) {
    domains[rawDomain.domain] = Object.entries(rawDomain.services).map(([service, info]) => ({
      domain: rawDomain.domain,
      service,
      description: info.description,
      fields: info.fields,
    }));
  }

  return {
    fetchedAt: new Date().toISOString(),
    domains,
  };
}

export function serviceExists(catalog: HaServiceCatalog, domain: string, service: string): boolean {
  return (catalog.domains[domain] ?? []).some((item) => item.service === service);
}
