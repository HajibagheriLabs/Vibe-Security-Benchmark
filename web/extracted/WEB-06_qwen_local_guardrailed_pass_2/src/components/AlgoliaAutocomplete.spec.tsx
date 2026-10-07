import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AlgoliaAutocomplete from './AlgoliaAutocomplete';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock Meilisearch client
jest.mock('@meilisearch/instant-meilisearch', () => ({
  instantMeiliSearch: jest.fn(() => ({
    index: jest.fn(() => ({
      search: jest.fn().mockResolvedValue({
        hits: [
          {
            objectID: '1',
            title: 'Test Product',
            description: 'A test description',
            url: 'https://example.com/product/1',
          },
        ],
      }),
    })),
  })),
}));

describe('AlgoliaAutocomplete', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    jest.clearAllMocks();
  });

  it('renders the search input', () => {
    render(<AlgoliaAutocomplete />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('shows results after typing', async () => {
    render(<AlgoliaAutocomplete />);
    const input = screen.getByPlaceholderText('Search...');
    
    fireEvent.change(input, { target: { value: 'Test' } });

    // Wait for debounce (300ms) and async search
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
  });

  it('navigates when a result is clicked', async () => {
    render(<AlgoliaAutocomplete />);
    const input = screen.getByPlaceholderText('Search...');
    
    fireEvent.change(input, { target: { value: 'Test' } });

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    const resultItem = screen.getByText('Test Product').parentElement;
    if (resultItem) {
      fireEvent.click(resultItem);
    }

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('https://example.com/product/1');
    });
  });

  it('filters invalid URLs', async () => {
    // Mock search to return an invalid URL
    const { instantMeiliSearch } = require('@meilisearch/instant-meilisearch');
    instantMeiliSearch.mockImplementation(() => ({
      index: () => ({
        search: () => Promise.resolve({
          hits: [{
            objectID: '2',
            title: 'Bad Product',
            description: 'Bad',
            url: 'javascript:alert(1)',
          }],
        }),
      }),
    }));

    render(<AlgoliaAutocomplete />);
    const input = screen.getByPlaceholderText('Search...');
    
    fireEvent.change(input, { target: { value: 'Bad' } });

    await waitFor(() => {
      expect(screen.getByText('Bad Product')).toBeInTheDocument();
    });

    const resultItem = screen.getByText('Bad Product').parentElement;
    if (resultItem) {
      fireEvent.click(resultItem);
    }

    // Should not have navigated
    expect(mockPush).not.toHaveBeenCalled();
  });
});