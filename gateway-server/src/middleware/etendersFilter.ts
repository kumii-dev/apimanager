/**
 * eTenders OCDS API Response Filter Middleware
 * 
 * This middleware filters OCDS release data from eTenders API based on various criteria.
 * Since the eTenders API doesn't support direct filtering, we fetch all releases and filter client-side.
 */

import { Request, Response, NextFunction } from 'express';

interface OCDSRelease {
  ocid: string;
  id: string;
  date: string;
  tag: string[];
  initiationType: string;
  tender: {
    id: string;
    title: string;
    status: string;
    category: string;
    province: string;
    deliveryLocation: string;
    description: string;
    procuringEntity: {
      id: string;
      name: string;
    };
    [key: string]: any;
  };
  buyer: {
    id: string;
    name: string;
  };
  [key: string]: any;
}

interface OCDSResponse {
  uri: string;
  version: string;
  publishedDate: string;
  publisher: any;
  license: string;
  publicationPolicy: string;
  releases: OCDSRelease[];
  links?: {
    next?: string;
  };
}

/**
 * Filter releases by buyer name or ID
 */
export function filterByBuyer(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  
  res.json = function(data: any) {
    // Only filter if it's an OCDS response with releases
    if (!data || !data.releases || !Array.isArray(data.releases)) {
      return originalJson(data);
    }

    const { buyerId, buyerName } = req.query;
    
    if (!buyerId && !buyerName) {
      return originalJson(data);
    }

    const filtered: OCDSResponse = {
      ...data,
      releases: data.releases.filter((release: OCDSRelease) => {
        if (buyerId && release.buyer?.id === buyerId) {
          return true;
        }
        if (buyerName) {
          const nameMatch = release.buyer?.name?.toLowerCase().includes(
            (buyerName as string).toLowerCase()
          );
          return nameMatch;
        }
        return false;
      })
    };

    // Update pagination if we filtered results
    if (filtered.releases.length !== data.releases.length) {
      delete filtered.links?.next; // Remove pagination since we filtered
    }

    return originalJson(filtered);
  };

  next();
}

/**
 * Filter releases by tender status
 */
export function filterByStatus(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  
  res.json = function(data: any) {
    if (!data || !data.releases || !Array.isArray(data.releases)) {
      return originalJson(data);
    }

    const { status } = req.params;
    
    if (!status) {
      return originalJson(data);
    }

    const filtered: OCDSResponse = {
      ...data,
      releases: data.releases.filter((release: OCDSRelease) => {
        return release.tender?.status?.toLowerCase() === status.toLowerCase();
      })
    };

    delete filtered.links?.next;

    return originalJson(filtered);
  };

  next();
}

/**
 * Filter releases by category
 */
export function filterByCategory(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  
  res.json = function(data: any) {
    if (!data || !data.releases || !Array.isArray(data.releases)) {
      return originalJson(data);
    }

    const { category } = req.params;
    
    if (!category) {
      return originalJson(data);
    }

    const categoryLower = category.toLowerCase();

    const filtered: OCDSResponse = {
      ...data,
      releases: data.releases.filter((release: OCDSRelease) => {
        const tenderCategory = release.tender?.category?.toLowerCase() || '';
        return tenderCategory.includes(categoryLower) || 
               categoryLower.includes(tenderCategory);
      })
    };

    delete filtered.links?.next;

    return originalJson(filtered);
  };

  next();
}

/**
 * Filter releases by province
 */
export function filterByProvince(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  
  res.json = function(data: any) {
    if (!data || !data.releases || !Array.isArray(data.releases)) {
      return originalJson(data);
    }

    const { province } = req.params;
    
    if (!province) {
      return originalJson(data);
    }

    const provinceLower = province.toLowerCase();

    const filtered: OCDSResponse = {
      ...data,
      releases: data.releases.filter((release: OCDSRelease) => {
        const tenderProvince = release.tender?.province?.toLowerCase() || '';
        return tenderProvince.includes(provinceLower) || 
               provinceLower.includes(tenderProvince);
      })
    };

    delete filtered.links?.next;

    return originalJson(filtered);
  };

  next();
}

/**
 * Generate statistics from releases
 */
export function generateStats(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  
  res.json = function(data: any) {
    if (!data || !data.releases || !Array.isArray(data.releases)) {
      return originalJson(data);
    }

    const releases = data.releases;

    // Calculate statistics
    const stats = {
      total: releases.length,
      byStatus: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byProvince: {} as Record<string, number>,
      byBuyer: {} as Record<string, number>,
      dateRange: {
        from: data.dateFrom || req.query.dateFrom,
        to: data.dateTo || req.query.dateTo
      },
      topBuyers: [] as Array<{ name: string; count: number }>,
      topCategories: [] as Array<{ category: string; count: number }>,
      topProvinces: [] as Array<{ province: string; count: number }>
    };

    releases.forEach((release: OCDSRelease) => {
      // Count by status
      const status = release.tender?.status || 'unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Count by category
      const category = release.tender?.category || 'unknown';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

      // Count by province
      const province = release.tender?.province || 'unknown';
      stats.byProvince[province] = (stats.byProvince[province] || 0) + 1;

      // Count by buyer
      const buyer = release.buyer?.name || 'unknown';
      stats.byBuyer[buyer] = (stats.byBuyer[buyer] || 0) + 1;
    });

    // Generate top lists
    stats.topBuyers = Object.entries(stats.byBuyer)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    stats.topCategories = Object.entries(stats.byCategory)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    stats.topProvinces = Object.entries(stats.byProvince)
      .map(([province, count]) => ({ province, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const response = {
      ...data,
      statistics: stats,
      releases: [] // Don't include individual releases in stats response
    };

    return originalJson(response);
  };

  next();
}

/**
 * Apply appropriate filter based on route path
 */
export function applyETendersFilter(req: Request, res: Response, next: NextFunction) {
  const path = req.path;

  if (path.includes('/releases/buyer')) {
    return filterByBuyer(req, res, next);
  } else if (path.match(/\/releases\/status\//)) {
    return filterByStatus(req, res, next);
  } else if (path.match(/\/releases\/category\//)) {
    return filterByCategory(req, res, next);
  } else if (path.match(/\/releases\/province\//)) {
    return filterByProvince(req, res, next);
  } else if (path.includes('/releases/stats')) {
    return generateStats(req, res, next);
  }

  next();
}

export default applyETendersFilter;
