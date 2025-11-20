import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

type CodeProps = React.ClassAttributes<HTMLElement> &
    React.HTMLAttributes<HTMLElement> & {
        inline?: boolean;
    };

const components: Components = {
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
    li: ({ children }) => <li className="mb-1">{children}</li>,

    h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4">{children}</h1>,
    h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3">{children}</h2>,
    h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2">{children}</h3>,

    code: ({ inline, className, children, ...props }: CodeProps) => (
        inline ? (
            <code
                className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                {...props}
            >
                {children}
            </code>
        ) : (
            <div className="relative my-4 rounded-lg bg-slate-900 p-4 font-mono text-xs text-slate-50 overflow-x-auto">
                <code className={className} {...props}>
                    {String(children).replace(/\n$/, '')}
                </code>
            </div>
        )
    ),

    table: ({ children }) => (
        <div className="my-4 w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm text-left">{children}</table>
        </div>
    ),
    thead: ({ children }) => <thead className="bg-slate-50 dark:bg-slate-800/50">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-slate-200 dark:divide-slate-700">{children}</tbody>,
    tr: ({ children }) => <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">{children}</tr>,
    th: ({ children }) => <th className="px-4 py-2 font-semibold text-slate-900 dark:text-slate-100">{children}</th>,
    td: ({ children }) => <td className="px-4 py-2">{children}</td>,

    blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-indigo-500 pl-4 italic my-2 text-gray-700 dark:text-gray-300">
            {children}
        </blockquote>
    ),
};

interface MessageMarkdownProps {
    content: string;
}

export const MessageMarkdown: React.FC<MessageMarkdownProps> = ({ content }) => {
    return <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{content}</ReactMarkdown>;
};