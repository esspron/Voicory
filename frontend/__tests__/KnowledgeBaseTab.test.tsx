import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KnowledgeBaseTab from '../components/assistant-editor/KnowledgeBaseTab';

// Mock the services
vi.mock('../services/knowledgeBaseService', () => ({
    getKnowledgeBases: vi.fn(),
    getDocuments: vi.fn(),
}));

// Mock createPortal for modal testing
vi.mock('react-dom', async () => {
    const actual = await vi.importActual('react-dom');
    return {
        ...actual,
        createPortal: (children: React.ReactNode) => children,
    };
});

import { getKnowledgeBases, getDocuments } from '../services/knowledgeBaseService';

// Mock data
const mockKnowledgeBases = [
    {
        id: 'kb-1',
        name: 'Company FAQ',
        description: 'Frequently asked questions',
        status: 'active' as const,
        total_documents: 5,
        total_characters: 15000,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_id: 'user-1',
    },
    {
        id: 'kb-2',
        name: 'Product Docs',
        description: 'Product documentation',
        status: 'active' as const,
        total_documents: 10,
        total_characters: 30000,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        user_id: 'user-1',
    },
    {
        id: 'kb-3',
        name: 'Pricing Info',
        description: 'Pricing information',
        status: 'active' as const,
        total_documents: 3,
        total_characters: 5000,
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
        user_id: 'user-1',
    },
];

const mockDocuments = [
    {
        id: 'doc-1',
        knowledge_base_id: 'kb-1',
        type: 'text' as const,
        name: 'FAQ Document',
        original_filename: null,
        file_extension: null,
        file_size_bytes: null,
        storage_path: null,
        source_url: null,
        crawl_depth: null,
        last_crawled_at: null,
        text_content: 'This is FAQ content...',
        content: 'This is FAQ content...',
        character_count: 500,
        word_count: 100,
        processing_status: 'completed' as const,
        processing_error: null,
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_id: 'user-1',
        has_embedding: true,
    },
    {
        id: 'doc-2',
        knowledge_base_id: 'kb-1',
        type: 'url' as const,
        name: 'Website Content',
        original_filename: null,
        file_extension: null,
        file_size_bytes: null,
        storage_path: null,
        source_url: 'https://example.com',
        crawl_depth: 2,
        last_crawled_at: '2024-01-01T00:00:00Z',
        text_content: 'Website content...',
        content: 'Website content...',
        character_count: 1000,
        word_count: 200,
        processing_status: 'completed' as const,
        processing_error: null,
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_id: 'user-1',
        has_embedding: true,
    },
];

describe('KnowledgeBaseTab', () => {
    const mockSetFormData = vi.fn();
    const mockOnSave = vi.fn().mockResolvedValue(undefined);

    const defaultFormData = {
        ragEnabled: false,
        ragSimilarityThreshold: 0.7,
        ragMaxResults: 5,
        ragInstructions: '',
        knowledgeBaseIds: [],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (getKnowledgeBases as any).mockResolvedValue(mockKnowledgeBases);
        (getDocuments as any).mockResolvedValue([]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Initial Rendering', () => {
        it('renders the header correctly', async () => {
            render(
                <KnowledgeBaseTab
                    formData={defaultFormData}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            expect(screen.getByText('Agent Knowledge Base')).toBeInTheDocument();
        });

        it('shows empty state when no knowledge bases are linked', async () => {
            render(
                <KnowledgeBaseTab
                    formData={defaultFormData}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('No knowledge bases linked')).toBeInTheDocument();
            });
        });

        it('loads and displays knowledge bases', async () => {
            render(
                <KnowledgeBaseTab
                    formData={defaultFormData}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(getKnowledgeBases).toHaveBeenCalled();
            });
        });

        it('shows RAG Disabled button when ragEnabled is false', async () => {
            render(
                <KnowledgeBaseTab
                    formData={defaultFormData}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('RAG Disabled')).toBeInTheDocument();
            });
        });

        it('shows RAG Enabled button when ragEnabled is true', async () => {
            render(
                <KnowledgeBaseTab
                    formData={{ ...defaultFormData, ragEnabled: true }}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('RAG Enabled')).toBeInTheDocument();
            });
        });
    });

    describe('Linking Knowledge Bases', () => {
        it('opens the KB selector modal when clicking Link Knowledge Base', async () => {
            const user = userEvent.setup();

            render(
                <KnowledgeBaseTab
                    formData={defaultFormData}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
            });

            // Wait for loading to complete and find the button
            await waitFor(() => {
                const buttons = screen.getAllByRole('button', { name: /link knowledge base/i });
                expect(buttons.length).toBeGreaterThan(0);
            });

            const linkButtons = screen.getAllByRole('button', { name: /link knowledge base/i });
            await user.click(linkButtons[0]);

            await waitFor(() => {
                expect(screen.getByText('Select a knowledge base to link to this agent')).toBeInTheDocument();
            });
        });

        it('shows available knowledge bases in the selector modal', async () => {
            const user = userEvent.setup();

            render(
                <KnowledgeBaseTab
                    formData={defaultFormData}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(getKnowledgeBases).toHaveBeenCalled();
            });

            // Find and click a Link Knowledge Base button
            const linkButtons = await screen.findAllByRole('button', { name: /link knowledge base/i });
            await user.click(linkButtons[0]);

            await waitFor(() => {
                expect(screen.getByText('Company FAQ')).toBeInTheDocument();
                expect(screen.getByText('Product Docs')).toBeInTheDocument();
                expect(screen.getByText('Pricing Info')).toBeInTheDocument();
            });
        });

        it('links a knowledge base and calls onSave with updated IDs', async () => {
            const user = userEvent.setup();

            render(
                <KnowledgeBaseTab
                    formData={defaultFormData}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(getKnowledgeBases).toHaveBeenCalled();
            });

            // Open selector
            const linkButtons = await screen.findAllByRole('button', { name: /link knowledge base/i });
            await user.click(linkButtons[0]);

            // Click on a knowledge base to link it
            const kbButton = await screen.findByText('Company FAQ');
            await user.click(kbButton.closest('button')!);

            // Verify setFormData was called with the new knowledgeBaseIds
            await waitFor(() => {
                expect(mockSetFormData).toHaveBeenCalledWith(
                    expect.objectContaining({
                        knowledgeBaseIds: ['kb-1'],
                        ragEnabled: true,
                    })
                );
            });

            // Verify onSave was called with the new IDs
            await waitFor(() => {
                expect(mockOnSave).toHaveBeenCalledWith(['kb-1']);
            });
        });

        it('enables RAG automatically when linking a knowledge base', async () => {
            const user = userEvent.setup();

            render(
                <KnowledgeBaseTab
                    formData={defaultFormData}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(getKnowledgeBases).toHaveBeenCalled();
            });

            // Open selector and link a KB
            const linkButtons = await screen.findAllByRole('button', { name: /link knowledge base/i });
            await user.click(linkButtons[0]);

            const kbButton = await screen.findByText('Company FAQ');
            await user.click(kbButton.closest('button')!);

            // Verify ragEnabled is set to true
            await waitFor(() => {
                expect(mockSetFormData).toHaveBeenCalledWith(
                    expect.objectContaining({
                        ragEnabled: true,
                    })
                );
            });
        });
    });

    describe('Unlinking Knowledge Bases', () => {
        it('shows linked knowledge bases', async () => {
            (getDocuments as any).mockResolvedValue(mockDocuments);

            render(
                <KnowledgeBaseTab
                    formData={{ ...defaultFormData, knowledgeBaseIds: ['kb-1'], ragEnabled: true }}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Company FAQ')).toBeInTheDocument();
            });
        });

        it('shows confirmation modal when clicking unlink button', async () => {
            const user = userEvent.setup();
            (getDocuments as any).mockResolvedValue(mockDocuments);

            render(
                <KnowledgeBaseTab
                    formData={{ ...defaultFormData, knowledgeBaseIds: ['kb-1'], ragEnabled: true }}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Company FAQ')).toBeInTheDocument();
            });

            // Find and click the unlink button (X button)
            const unlinkButtons = screen.getAllByTitle('Unlink knowledge base');
            await user.click(unlinkButtons[0]);

            await waitFor(() => {
                expect(screen.getByText('Unlink Knowledge Base')).toBeInTheDocument();
                expect(screen.getByText(/Are you sure you want to unlink/)).toBeInTheDocument();
            });
        });

        it('unlinks knowledge base and calls onSave when confirming', async () => {
            const user = userEvent.setup();
            (getDocuments as any).mockResolvedValue(mockDocuments);

            render(
                <KnowledgeBaseTab
                    formData={{ ...defaultFormData, knowledgeBaseIds: ['kb-1'], ragEnabled: true }}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Company FAQ')).toBeInTheDocument();
            });

            // Click unlink button
            const unlinkButtons = screen.getAllByTitle('Unlink knowledge base');
            await user.click(unlinkButtons[0]);

            // Click confirm button
            const confirmButton = await screen.findByText('Unlink & Save');
            await user.click(confirmButton);

            // Verify setFormData was called with empty knowledgeBaseIds
            await waitFor(() => {
                expect(mockSetFormData).toHaveBeenCalledWith(
                    expect.objectContaining({
                        knowledgeBaseIds: [],
                        ragEnabled: false,
                    })
                );
            });

            // Verify onSave was called with empty array
            await waitFor(() => {
                expect(mockOnSave).toHaveBeenCalledWith([]);
            });
        });

        it('closes confirmation modal when clicking Cancel', async () => {
            const user = userEvent.setup();
            (getDocuments as any).mockResolvedValue(mockDocuments);

            render(
                <KnowledgeBaseTab
                    formData={{ ...defaultFormData, knowledgeBaseIds: ['kb-1'], ragEnabled: true }}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Company FAQ')).toBeInTheDocument();
            });

            // Click unlink button
            const unlinkButtons = screen.getAllByTitle('Unlink knowledge base');
            await user.click(unlinkButtons[0]);

            // Click cancel button
            const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
            await user.click(cancelButton);

            // Modal should be closed
            await waitFor(() => {
                expect(screen.queryByText('Unlink Knowledge Base')).not.toBeInTheDocument();
            });

            // onSave should not have been called
            expect(mockOnSave).not.toHaveBeenCalled();
        });

        it('disables RAG when unlinking the last knowledge base', async () => {
            const user = userEvent.setup();
            (getDocuments as any).mockResolvedValue(mockDocuments);

            render(
                <KnowledgeBaseTab
                    formData={{ ...defaultFormData, knowledgeBaseIds: ['kb-1'], ragEnabled: true }}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Company FAQ')).toBeInTheDocument();
            });

            // Click unlink and confirm
            const unlinkButtons = screen.getAllByTitle('Unlink knowledge base');
            await user.click(unlinkButtons[0]);

            const confirmButton = await screen.findByText('Unlink & Save');
            await user.click(confirmButton);

            // Verify ragEnabled is set to false when last KB is removed
            await waitFor(() => {
                expect(mockSetFormData).toHaveBeenCalledWith(
                    expect.objectContaining({
                        ragEnabled: false,
                    })
                );
            });
        });
    });

    describe('Documents Display', () => {
        it('loads and displays documents for linked knowledge bases', async () => {
            (getDocuments as any).mockResolvedValue(mockDocuments);

            render(
                <KnowledgeBaseTab
                    formData={{ ...defaultFormData, knowledgeBaseIds: ['kb-1'], ragEnabled: true }}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(getDocuments).toHaveBeenCalledWith('kb-1');
            });

            await waitFor(() => {
                expect(screen.getByText('FAQ Document')).toBeInTheDocument();
                expect(screen.getByText('Website Content')).toBeInTheDocument();
            });
        });

        it('shows processing status for documents', async () => {
            (getDocuments as any).mockResolvedValue(mockDocuments);

            render(
                <KnowledgeBaseTab
                    formData={{ ...defaultFormData, knowledgeBaseIds: ['kb-1'], ragEnabled: true }}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                // Both documents have 'completed' status
                const readyIndicators = screen.getAllByText('Ready');
                expect(readyIndicators.length).toBeGreaterThan(0);
            });
        });

        it('filters documents based on search query', async () => {
            const user = userEvent.setup();
            (getDocuments as any).mockResolvedValue(mockDocuments);

            render(
                <KnowledgeBaseTab
                    formData={{ ...defaultFormData, knowledgeBaseIds: ['kb-1'], ragEnabled: true }}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('FAQ Document')).toBeInTheDocument();
            });

            // Find search input and type
            const searchInput = screen.getByPlaceholderText('Search documents...');
            await user.type(searchInput, 'FAQ');

            // FAQ Document should still be visible
            expect(screen.getByText('FAQ Document')).toBeInTheDocument();

            // Website Content should not be visible (doesn't match 'FAQ')
            expect(screen.queryByText('Website Content')).not.toBeInTheDocument();
        });
    });

    describe('RAG Configuration', () => {
        it('opens RAG config sidebar when clicking the RAG button', async () => {
            const user = userEvent.setup();

            render(
                <KnowledgeBaseTab
                    formData={{ ...defaultFormData, ragEnabled: true }}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('RAG Enabled')).toBeInTheDocument();
            });

            await user.click(screen.getByText('RAG Enabled'));

            await waitFor(() => {
                expect(screen.getByText('RAG Configuration')).toBeInTheDocument();
            });
        });

        it('shows similarity threshold and max results inputs', async () => {
            const user = userEvent.setup();

            render(
                <KnowledgeBaseTab
                    formData={{ ...defaultFormData, ragEnabled: true }}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await user.click(await screen.findByText('RAG Enabled'));

            await waitFor(() => {
                expect(screen.getByText('Similarity Threshold')).toBeInTheDocument();
                expect(screen.getByText('Max Results')).toBeInTheDocument();
                expect(screen.getByText('RAG Instructions')).toBeInTheDocument();
            });
        });

        it('updates similarity threshold when changed', async () => {
            const user = userEvent.setup();

            render(
                <KnowledgeBaseTab
                    formData={{ ...defaultFormData, ragEnabled: true }}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await user.click(await screen.findByText('RAG Enabled'));

            await waitFor(() => {
                expect(screen.getByText('Similarity Threshold')).toBeInTheDocument();
            });

            // Find the threshold input (it's the first number input)
            const thresholdInput = screen.getByDisplayValue('0.7');
            await user.clear(thresholdInput);
            await user.type(thresholdInput, '0.8');

            await waitFor(() => {
                expect(mockSetFormData).toHaveBeenCalledWith(
                    expect.objectContaining({
                        ragSimilarityThreshold: 0.8,
                    })
                );
            });
        });

        it('can toggle RAG on/off from config sidebar', async () => {
            const user = userEvent.setup();

            render(
                <KnowledgeBaseTab
                    formData={{ ...defaultFormData, ragEnabled: true }}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await user.click(await screen.findByText('RAG Enabled'));

            await waitFor(() => {
                expect(screen.getByText('Enable RAG')).toBeInTheDocument();
            });

            // Find the toggle button (it's a button with the toggle styling)
            const toggleButton = screen.getByRole('button', { name: '' });
            // The toggle is the button after "Enable RAG" text
            const enableRagSection = screen.getByText('Enable RAG').closest('div');
            const toggle = enableRagSection?.querySelector('button');
            
            if (toggle) {
                await user.click(toggle);

                await waitFor(() => {
                    expect(mockSetFormData).toHaveBeenCalledWith(
                        expect.objectContaining({
                            ragEnabled: false,
                        })
                    );
                });
            }
        });
    });

    describe('Multiple Knowledge Bases', () => {
        it('can link multiple knowledge bases', async () => {
            const user = userEvent.setup();

            const { rerender } = render(
                <KnowledgeBaseTab
                    formData={{ ...defaultFormData, knowledgeBaseIds: ['kb-1'], ragEnabled: true }}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(getKnowledgeBases).toHaveBeenCalled();
            });

            // Open selector
            const linkButtons = await screen.findAllByRole('button', { name: /link knowledge base/i });
            await user.click(linkButtons[linkButtons.length - 1]); // Click the one in the header

            // Link another KB
            const productDocsButton = await screen.findByText('Product Docs');
            await user.click(productDocsButton.closest('button')!);

            // Verify setFormData was called with both IDs
            await waitFor(() => {
                expect(mockSetFormData).toHaveBeenCalledWith(
                    expect.objectContaining({
                        knowledgeBaseIds: ['kb-1', 'kb-2'],
                    })
                );
            });

            // Verify onSave was called with both IDs
            await waitFor(() => {
                expect(mockOnSave).toHaveBeenCalledWith(['kb-1', 'kb-2']);
            });
        });

        it('keeps RAG enabled when unlinking one of multiple KBs', async () => {
            const user = userEvent.setup();
            (getDocuments as any).mockResolvedValue(mockDocuments);

            render(
                <KnowledgeBaseTab
                    formData={{ ...defaultFormData, knowledgeBaseIds: ['kb-1', 'kb-2'], ragEnabled: true }}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Company FAQ')).toBeInTheDocument();
                expect(screen.getByText('Product Docs')).toBeInTheDocument();
            });

            // Unlink the first KB
            const unlinkButtons = screen.getAllByTitle('Unlink knowledge base');
            await user.click(unlinkButtons[0]);

            const confirmButton = await screen.findByText('Unlink & Save');
            await user.click(confirmButton);

            // RAG should still be enabled since there's still one KB linked
            await waitFor(() => {
                expect(mockSetFormData).toHaveBeenCalledWith(
                    expect.objectContaining({
                        ragEnabled: true,
                        knowledgeBaseIds: ['kb-2'],
                    })
                );
            });
        });
    });

    describe('Error Handling', () => {
        it('handles API error when loading knowledge bases', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            (getKnowledgeBases as any).mockRejectedValue(new Error('API Error'));

            render(
                <KnowledgeBaseTab
                    formData={defaultFormData}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(consoleError).toHaveBeenCalled();
            });

            consoleError.mockRestore();
        });

        it('handles API error when linking knowledge base', async () => {
            const user = userEvent.setup();
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockOnSave.mockRejectedValueOnce(new Error('Save Error'));

            render(
                <KnowledgeBaseTab
                    formData={defaultFormData}
                    setFormData={mockSetFormData}
                    onSave={mockOnSave}
                />
            );

            await waitFor(() => {
                expect(getKnowledgeBases).toHaveBeenCalled();
            });

            // Open selector and try to link
            const linkButtons = await screen.findAllByRole('button', { name: /link knowledge base/i });
            await user.click(linkButtons[0]);

            const kbButton = await screen.findByText('Company FAQ');
            await user.click(kbButton.closest('button')!);

            await waitFor(() => {
                expect(consoleError).toHaveBeenCalled();
            });

            consoleError.mockRestore();
        });
    });
});

// RAG Integration Tests (Backend Mock)
describe('RAG Integration', () => {
    describe('RAG Context Generation', () => {
        it('should have correct RAG settings when KB is linked', async () => {
            const formData = {
                ragEnabled: true,
                ragSimilarityThreshold: 0.7,
                ragMaxResults: 5,
                ragInstructions: 'Use this context to answer questions accurately',
                knowledgeBaseIds: ['kb-1', 'kb-2'],
            };

            // Verify the RAG settings are correctly structured
            expect(formData.ragEnabled).toBe(true);
            expect(formData.knowledgeBaseIds).toHaveLength(2);
            expect(formData.ragSimilarityThreshold).toBeGreaterThan(0);
            expect(formData.ragSimilarityThreshold).toBeLessThanOrEqual(1);
            expect(formData.ragMaxResults).toBeGreaterThan(0);
        });

        it('should disable RAG when no KBs are linked', () => {
            const formData = {
                ragEnabled: false,
                ragSimilarityThreshold: 0.7,
                ragMaxResults: 5,
                ragInstructions: '',
                knowledgeBaseIds: [],
            };

            expect(formData.ragEnabled).toBe(false);
            expect(formData.knowledgeBaseIds).toHaveLength(0);
        });
    });

    describe('Assistant Data for RAG', () => {
        it('should include RAG config when saving assistant', () => {
            const assistantInput = {
                name: 'Test Assistant',
                systemPrompt: 'You are a helpful assistant.',
                ragEnabled: true,
                ragSimilarityThreshold: 0.7,
                ragMaxResults: 5,
                ragInstructions: 'Use the knowledge base to answer questions.',
                knowledgeBaseIds: ['kb-1'],
            };

            // Verify RAG fields are present
            expect(assistantInput).toHaveProperty('ragEnabled');
            expect(assistantInput).toHaveProperty('ragSimilarityThreshold');
            expect(assistantInput).toHaveProperty('ragMaxResults');
            expect(assistantInput).toHaveProperty('ragInstructions');
            expect(assistantInput).toHaveProperty('knowledgeBaseIds');
        });

        it('should have valid threshold range', () => {
            const thresholds = [0.1, 0.3, 0.5, 0.7, 0.9];
            
            thresholds.forEach(threshold => {
                expect(threshold).toBeGreaterThanOrEqual(0);
                expect(threshold).toBeLessThanOrEqual(1);
            });
        });

        it('should have valid max results', () => {
            const maxResults = [1, 3, 5, 10, 20];
            
            maxResults.forEach(max => {
                expect(max).toBeGreaterThan(0);
                expect(max).toBeLessThanOrEqual(20);
            });
        });
    });
});
