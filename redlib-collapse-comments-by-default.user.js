// ==UserScript==
// @name         Redlib collapse comments by default
// @namespace    https://github.com/azizLIGHT
// @version      2.1
// @description  Redlib comments are loaded collapsed except top level comments. Expand/Collapse a top level comment's child comments with [+++]/[---] if the parent is interesting enough. Load more comments in place without duplication.
// @author       azizLIGHT
// @match        https://redlib.catsarch.com/r/*/comments/*
// @match        https://redlib.perennialte.ch/r/*/comments/*
// @match        https://libreddit.privacydev.net/r/*/comments/*
// @match        https://rl.bloat.cat/r/*/comments/*
// @match        https://redlib.r4fo.com/r/*/comments/*
// @match        https://redlib.ducks.party/r/*/comments/*
// @match        https://red.ngn.tf/r/*/comments/*
// @match        https://red.artemislena.eu/r/*/comments/*
// @match        https://redlib.privacyredirect.com/r/*/comments/*
// @match        https://reddit.nerdvpn.de/r/*/comments/*
// @match        https://redlib.nadeko.net/r/*/comments/*
// @match        https://redlib.private.coffee/r/*/comments/*
// @match        https://redlib.4o1x5.dev/r/*/comments/*
// @match        https://redlib.nohost.network/r/*/comments/*
// @grant        GM_addStyle
// @homepageURL https://github.com/azizLIGHT/redlib-collapse-comments-by-default
// @supportURL  https://github.com/azizLIGHT/redlib-collapse-comments-by-default/issues
// @license MIT
// ==/UserScript==

(function() {
    'use strict';

    // Combined CSS styles
    if (typeof GM_addStyle !== 'undefined') {
        GM_addStyle(`
            /* Hide native expand/collapse markers */
            .comment_right > summary::marker,
            .comment_right > summary::-webkit-details-marker {
                display: none;
            }

            /* Hide the useless grey comment score box */
            .comment_score {
                display: none !important;
            }

            /* Hide ALL comment_left content except thread lines */
            .comment_left > *:not(.line) {
                display: none !important;
            }

            /* Ensure thread lines remain visible */
            .comment_left .line {
                display: block !important;
            }

            /* Hide any remaining native collapse/expand indicators */
            .comment_right summary::before,
            .comment_right summary::after {
                display: none !important;
            }

            /* Custom expand/collapse button */
            .expand-children {
                color: #666;
                text-decoration: none;
                font-family: monospace;
                font-size: 11px;
                cursor: pointer;
                margin-right: 5px;
                display: inline-block;
            }
            .expand-children:hover {
                color: #000;
            }

            /* Much more compact comment layout */
            .comment {
                margin-bottom: 1px !important;
                padding-bottom: 0 !important;
            }

            .comment_body {
                margin-bottom: 2px !important;
                padding-bottom: 2px !important;
            }

            .comment_data {
                margin-bottom: 1px !important;
                padding-bottom: 0 !important;
            }

            /* Reduce spacing in reply chains */
            .replies {
                margin-top: 1px !important;
                padding-top: 0 !important;
            }

            /* Make the thread lines more compact */
            .comment_left .line {
                margin-top: 0 !important;
            }

            /* Reduce overall thread spacing */
            .thread {
                margin-bottom: 3px !important;
            }

            /* Tighter blockquote replies */
            blockquote.replies {
                margin-top: 1px !important;
                margin-bottom: 1px !important;
            }

            /* Alternating background colors for nesting levels like old Reddit - shifted up one level */
            .comment {
                background-color: transparent !important;
            }

            /* Level 0 - Top level comments (now get level 1 background) */
            .thread > .comment {
                background-color: rgba(255, 255, 255, 0.02) !important;
            }

            /* Level 1 - Direct replies to top level (now get level 2 background) */
            .thread > .comment .replies > .comment {
                background-color: rgba(255, 255, 255, 0.04) !important;
            }

            /* Level 2 - Replies to level 1 (now get level 3 background) */
            .thread > .comment .replies > .comment .replies > .comment {
                background-color: rgba(255, 255, 255, 0.06) !important;
            }

            /* Level 3 - Replies to level 2 (now get level 4 background) */
            .thread > .comment .replies > .comment .replies > .comment .replies > .comment {
                background-color: rgba(255, 255, 255, 0.08) !important;
            }

            /* Level 4 - Replies to level 3 (now get level 5 background) */
            .thread > .comment .replies > .comment .replies > .comment .replies > .comment .replies > .comment {
                background-color: rgba(255, 255, 255, 0.10) !important;
            }

            /* Level 5 and beyond - Replies to level 4+ (now get level 6 background) */
            .thread > .comment .replies > .comment .replies > .comment .replies > .comment .replies > .comment .replies > .comment {
                background-color: rgba(255, 255, 255, 0.12) !important;
            }

            /* AJAX loading states */
            .ajax-loading {
                opacity: 0.6;
                pointer-events: none;
            }
            .ajax-loading::after {
                content: " (Loading...)";
                color: #666;
                font-style: italic;
            }
            .ajax-error {
                color: #ff4444;
                font-style: italic;
                text-decoration: none !important;
            }
        `);
    }

    // Global state to track initialized comments
    const initializedComments = new Set();

    // Main initialization function
    function initializeComments() {
        // Step 1: Collapse all child comments (everything except top-level)
        const allChildComments = document.querySelectorAll('.thread .comment .replies .comment');
        allChildComments.forEach(comment => {
            const details = comment.querySelector('.comment_right');
            if (details && details.hasAttribute('open')) {
                details.removeAttribute('open');
            }
        });

        // Step 2: Add custom [+++]/[---] buttons to all comments
        const allComments = document.querySelectorAll('.comment');
        allComments.forEach(comment => {
            if (!initializedComments.has(comment)) {
                addCustomExpandButton(comment);
                initializedComments.add(comment);
            }
        });

        // Step 3: Initialize AJAX "More replies" links
        attachMoreRepliesListeners();
    }

    // Add custom expand/collapse button to a comment
    function addCustomExpandButton(comment) {
        const summary = comment.querySelector('.comment_right > summary');
        if (!summary || summary.querySelector('.expand-children')) {
            return; // Already has button or no valid target
        }

        // Add [+++] button to ALL comments for visual consistency
        // Create the custom button
        const expandButton = document.createElement('span');
        expandButton.className = 'expand-children';
        expandButton.textContent = '[+++]';
        expandButton.setAttribute('data-expanded', 'false');

        // Add click handler
        expandButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleCustomToggle(comment, expandButton);
        });

        // Insert the button at the beginning of the summary
        summary.insertBefore(expandButton, summary.firstChild);

        // Prevent the native details toggle from working
        summary.addEventListener('click', function(e) {
            if (e.target === summary) {
                e.preventDefault();
            }
        });
    }

    // Handle custom expand/collapse toggle
    function handleCustomToggle(comment, button) {
        const isExpanded = button.getAttribute('data-expanded') === 'true';

        if (isExpanded) {
            // Collapse - hide all direct children
            collapseDirectChildren(comment);
            button.textContent = '[+++]';
            button.setAttribute('data-expanded', 'false');
        } else {
            // Expand - show direct children, hide grandchildren
            expandDirectChildrenOnly(comment);
            button.textContent = '[---]';
            button.setAttribute('data-expanded', 'true');
        }
    }

    // Expand only direct children, collapse grandchildren
    function expandDirectChildrenOnly(parentComment) {
        const directChildren = parentComment.querySelectorAll(':scope > .comment_right > .replies > .comment');

        directChildren.forEach(child => {
            // Show the direct child
            const childDetails = child.querySelector('.comment_right');
            if (childDetails) {
                childDetails.setAttribute('open', '');
            }

            // Make sure grandchildren are collapsed
            const grandchildren = child.querySelectorAll(':scope > .comment_right > .replies > .comment');
            grandchildren.forEach(grandchild => {
                const grandchildDetails = grandchild.querySelector('.comment_right');
                if (grandchildDetails && grandchildDetails.hasAttribute('open')) {
                    grandchildDetails.removeAttribute('open');
                }

                // Reset the grandchild's button state
                const grandchildButton = grandchild.querySelector('.expand-children');
                if (grandchildButton) {
                    grandchildButton.textContent = '[+++]';
                    grandchildButton.setAttribute('data-expanded', 'false');
                }
            });
        });
    }

    // Collapse direct children and all descendants
    function collapseDirectChildren(parentComment) {
        const directChildren = parentComment.querySelectorAll(':scope > .comment_right > .replies > .comment');

        directChildren.forEach(child => {
            // Hide the child
            const childDetails = child.querySelector('.comment_right');
            if (childDetails) {
                childDetails.removeAttribute('open');
            }

            // Reset the child's button state
            const childButton = child.querySelector('.expand-children');
            if (childButton) {
                childButton.textContent = '[+++]';
                childButton.setAttribute('data-expanded', 'false');
            }

            // Also collapse any descendants
            const descendants = child.querySelectorAll('.comment_right');
            descendants.forEach(desc => {
                desc.removeAttribute('open');
            });

            // Reset all descendant button states
            const descendantButtons = child.querySelectorAll('.expand-children');
            descendantButtons.forEach(btn => {
                btn.textContent = '[+++]';
                btn.setAttribute('data-expanded', 'false');
            });
        });
    }

    // Remove duplicate comments by ID
    function removeDuplicateComments(parentContainer) {
        const seenIds = new Set();
        const comments = parentContainer.querySelectorAll(':scope > div.comment');

        comments.forEach(comment => {
            const commentId = comment.id;
            if (commentId) {
                if (seenIds.has(commentId)) {
                    console.log(`Removing duplicate comment: ${commentId}`);
                    comment.remove();
                } else {
                    seenIds.add(commentId);
                }
            }
        });
    }

    // Check if the response is a Cloudflare bot protection page
    function isBotProtectionPage(html) {
        // Detect the exact Cloudflare challenge page you provided
        return html.includes('<title>Just a moment...</title>') ||
               html.includes('redlib.nohost.network needs to review the security of your connection');
    }

    // AJAX functionality for loading more comments
    function loadMoreComments(link) {
        const url = link.href;
        const parentBlockquote = link.closest('blockquote.replies');

        if (!parentBlockquote) {
            console.error('Could not find parent blockquote');
            return;
        }

        // Add loading state
        link.classList.add('ajax-loading');

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                // Check if we got a bot protection page
                if (isBotProtectionPage(html)) {
                    throw new Error('Bot protection triggered - please refresh the page and complete the verification');
                }

                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // Find the specific comment thread in the response
                const commentId = extractCommentId(url);
                const targetComment = doc.querySelector(`#${commentId}`);

                if (!targetComment) {
                    console.error('Comment not found in response:', commentId);
                    throw new Error('Comment not found in response');
                }

                // Find the replies blockquote in the fetched comment
                const newRepliesBlockquote = targetComment.querySelector('blockquote.replies');

                if (newRepliesBlockquote) {
                    // Get all comment divs from the new replies
                    const newComments = newRepliesBlockquote.querySelectorAll(':scope > div.comment');

                    // Remove the "More replies" link
                    link.remove();

                    // Insert new comments
                    newComments.forEach((comment, index) => {
                        // Clone the comment and all its content
                        const clonedComment = comment.cloneNode(true);

                        // Initialize collapse functionality for new comments
                        initializeNewComment(clonedComment);

                        parentBlockquote.appendChild(clonedComment);
                        console.log(`➕ Inserted comment ${index + 1}:`, comment.id);
                    });

                    // Remove duplicates after insertion
                    removeDuplicateComments(parentBlockquote);

                    // Look for any "More replies" links in the new content and handle them
                    const newMoreRepliesLinks = newRepliesBlockquote.querySelectorAll('a.deeper_replies');
                    newMoreRepliesLinks.forEach(newLink => {
                        const clonedLink = newLink.cloneNode(true);
                        clonedLink.href = newLink.href;

                        // Add to the appropriate location
                        const newLinkComment = newLink.closest('div.comment');
                        if (newLinkComment) {
                            const correspondingComment = parentBlockquote.querySelector(`#${newLinkComment.id}`);
                            if (correspondingComment) {
                                const correspondingReplies = correspondingComment.querySelector('blockquote.replies');
                                if (correspondingReplies) {
                                    correspondingReplies.appendChild(clonedLink);
                                    attachMoreRepliesListener(clonedLink);
                                }
                            }
                        }
                    });
                } else {
                    // No more replies found, just remove the link
                    link.remove();
                }
            })
            .catch(error => {
                console.error('Error loading comments:', error);
                link.classList.remove('ajax-loading');
                link.classList.add('ajax-error');

                // Create retry link instead of making it unclickable
                link.textContent = `→ ${error.message} (Click to retry)`;
                link.style.pointerEvents = 'auto';
                link.style.cursor = 'pointer';

                // Add retry functionality
                link.onclick = function(e) {
                    e.preventDefault();
                    // Reset the link state and try again
                    link.classList.remove('ajax-error');
                    link.textContent = '→ More replies';
                    link.onclick = null; // Remove retry handler
                    loadMoreComments(link); // Try loading again
                };
            });
    }

    // Initialize a newly loaded comment (from AJAX) - FIXED VERSION
    function initializeNewComment(comment) {
        if (!initializedComments.has(comment)) {
            // Ensure the comment and ALL its descendants start collapsed
            collapseCommentAndDescendants(comment);

            // Add collapse button to the new comment
            addCustomExpandButton(comment);
            initializedComments.add(comment);

            // Initialize all child comments and ensure they start collapsed
            const childComments = comment.querySelectorAll('.comment');
            childComments.forEach(childComment => {
                if (!initializedComments.has(childComment)) {
                    // Ensure child is collapsed first
                    collapseCommentAndDescendants(childComment);

                    addCustomExpandButton(childComment);
                    initializedComments.add(childComment);
                }
            });
        }
    }

    // Helper function to collapse a comment and all its descendants
    function collapseCommentAndDescendants(comment) {
        // Collapse the comment itself
        const details = comment.querySelector(':scope > .comment_right');
        if (details && details.hasAttribute('open')) {
            details.removeAttribute('open');
        }

        // Reset button state
        const button = comment.querySelector(':scope > .comment_right > summary > .expand-children');
        if (button) {
            button.textContent = '[+++]';
            button.setAttribute('data-expanded', 'false');
        }

        // Collapse all descendant comments
        const descendants = comment.querySelectorAll('.comment_right');
        descendants.forEach(desc => {
            desc.removeAttribute('open');
        });

        // Reset all descendant button states
        const descendantButtons = comment.querySelectorAll('.expand-children');
        descendantButtons.forEach(btn => {
            btn.textContent = '[+++]';
            btn.setAttribute('data-expanded', 'false');
        });
    }

    // Extract comment ID from URL
    function extractCommentId(url) {
        const patterns = [
            /\/([a-z0-9]+)(?:\/?\?|$)/,
            /\/([a-z0-9]+)(?:\/?#|$)/,
            /\/comments\/[^\/]+\/[^\/]+\/([a-z0-9]+)/,
            /\/([a-z0-9]+)$/
        ];

        for (let pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return null;
    }

    // Attach event listener to a "More replies" link
    function attachMoreRepliesListener(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            loadMoreComments(this);
        });
    }

    // Attach event listeners to all "More replies" links
    function attachMoreRepliesListeners(container = document) {
        const moreRepliesLinks = container.querySelectorAll('a.deeper_replies');
        moreRepliesLinks.forEach(attachMoreRepliesListener);
    }

    // Initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeComments);
    } else {
        initializeComments();
    }

    // Also run after a delay to catch any dynamically loaded content
    setTimeout(initializeComments, 1000);

    // Expose functions globally in case they're needed by AJAX-loaded content
    window.redlibEnhanced = {
        initializeNewComment,
        addCustomExpandButton,
        attachMoreRepliesListeners,
        removeDuplicateComments
    };

})();
