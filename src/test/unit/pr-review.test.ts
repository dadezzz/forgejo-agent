// Unit tests for the Forgejo client functions that compose multiple API
// calls or transform the responses (getPrReviews, getPrReviewsWithComments).
// forgejoFetch is mocked so no real instance is needed.
import { describe, expect, it, vi } from "vitest";
import { getPrReviews, getPrReviewsWithComments } from "../../forgejo/index.ts";
import { mockApiCtx } from "../fixtures.ts";
import { forgejoFetch } from "../../forgejo/fetch.ts";

vi.mock(import("../../forgejo/fetch.ts"), () => ({
  forgejoFetch: vi.fn(),
}));

const submittedReview = {
  id: 1,
  body: "looks good",
  user: { username: "ci-bot" },
  state: "APPROVED",
  commit_id: "abc123",
  submitted_at: "2024-01-01T00:00:00Z",
};

const pendingReview = {
  id: 2,
  body: "draft",
  user: { username: "ci-bot" },
  state: "PENDING",
  commit_id: "abc123",
  submitted_at: "2024-01-01T00:00:00Z",
};

const inlineComment = {
  body: "this line is wrong",
  user: { username: "ci-bot" },
  path: "src/main.ts",
  line: 42,
  created_at: "2024-01-01T00:00:00Z",
};

describe("getPrReviews", () => {
  it("skips pending reviews", async () => {
    vi.mocked(forgejoFetch).mockResolvedValue([submittedReview, pendingReview]);

    const reviews = await getPrReviews(mockApiCtx, "owner/repo", 3);

    expect(forgejoFetch).toHaveBeenCalledWith(mockApiCtx, "/repos/owner/repo/pulls/3/reviews", expect.anything());
    expect(reviews).toEqual([submittedReview]);
  });

  it("returns an empty list when all reviews are pending", async () => {
    vi.mocked(forgejoFetch).mockResolvedValue([pendingReview]);

    const reviews = await getPrReviews(mockApiCtx, "owner/repo", 3);

    expect(reviews).toEqual([]);
  });
});

describe("getPrReviewsWithComments", () => {
  it("attaches the inline comments to each review", async () => {
    vi.mocked(forgejoFetch).mockImplementation(async (_apiCtx, pathname) => {
      if (pathname.endsWith("/reviews")) return [submittedReview];
      return [inlineComment];
    });

    const reviews = await getPrReviewsWithComments(mockApiCtx, "owner/repo", 3);

    expect(forgejoFetch).toHaveBeenNthCalledWith(
      2,
      mockApiCtx,
      "/repos/owner/repo/pulls/3/reviews/1/comments",
      expect.anything(),
    );
    expect(reviews).toEqual([{ ...submittedReview, comments: [inlineComment] }]);
  });

  it("skips pending reviews before fetching their comments", async () => {
    vi.mocked(forgejoFetch).mockImplementation(async (_apiCtx, pathname) => {
      if (pathname.endsWith("/reviews")) {
        return [submittedReview, pendingReview];
      } else {
        return [inlineComment];
      }
    });

    const reviews = await getPrReviewsWithComments(mockApiCtx, "owner/repo", 3);

    // One call for the reviews list, one for the submitted review's comments,
    // but none for the pending review.
    expect(forgejoFetch).toHaveBeenCalledTimes(2);
    expect(reviews).toEqual([{ ...submittedReview, comments: [inlineComment] }]);
  });
});
