import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s<]+[^\s<.,;:!?"')}\]])/g;

/**
 * Renders text with auto-detected URLs as clickable links.
 * Pass text as children. Non-string children are returned as-is.
 */
const Linkify = ({ children, className }) => {
    if (typeof children !== 'string' || !children) return children || null;

    const parts = [];
    let lastIndex = 0;
    let match;

    const regex = new RegExp(URL_REGEX);
    while ((match = regex.exec(children)) !== null) {
        if (match.index > lastIndex) {
            parts.push(children.slice(lastIndex, match.index));
        }
        parts.push(
            <a
                key={match.index}
                href={match[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline break-all"
                onClick={(e) => e.stopPropagation()}
            >
                {match[0]}
            </a>
        );
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < children.length) {
        parts.push(children.slice(lastIndex));
    }

    if (parts.length === 0) return children;

    return className ? <span className={className}>{parts}</span> : <>{parts}</>;
};

export default Linkify;
