import {
  mockCourseDescription,
  mockCourses,
  mockSubjects,
  mockTerms,
} from "./courses.js";

function apiPayload(data, extra = {}) {
  return {
    success: true,
    source: "live",
    cached_at: Math.floor(Date.now() / 1000),
    data,
    ...extra,
  };
}

function paginatedPage(items, offset, max) {
  const hasMore = items.length >= max;
  return {
    items,
    offset,
    max,
    has_more: hasMore,
    next_offset: hasMore ? offset + 1 : null,
  };
}

function isBackendApiRequest(urlString) {
  try {
    const { hostname, port, pathname } = new URL(urlString);
    const isLocalApiHost =
      (hostname === "localhost" || hostname === "127.0.0.1") && port === "8000";
    return isLocalApiHost && pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

function matchApiPath(url) {
  const { pathname } = new URL(url);
  return pathname.slice("/api".length);
}

export async function installMockApi(page) {
  await page.route(isBackendApiRequest, async (route) => {
    const apiPath = matchApiPath(route.request().url());

    if (apiPath === "/health") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(apiPayload({ status: "ok" })),
      });
      return;
    }

    if (apiPath === "/terms") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(apiPayload(paginatedPage(mockTerms, 1, 10))),
      });
      return;
    }

    if (apiPath === "/subjects") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          apiPayload({
            ...paginatedPage(mockSubjects, 1, 10),
            searchTerm: "",
          })
        ),
      });
      return;
    }

    if (apiPath === "/courses") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          apiPayload(mockCourses, { cache_ttl_seconds: 600 })
        ),
      });
      return;
    }

    if (apiPath.startsWith("/courses/") && apiPath.endsWith("/description")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(apiPayload(mockCourseDescription)),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ success: false, message: `Unhandled mock route: ${apiPath}` }),
    });
  });
}
