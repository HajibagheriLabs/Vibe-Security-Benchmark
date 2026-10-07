<SearchAutocomplete
  renderItem={(hit, children) => (
    <div className="custom-item">
      <Badge>{hit.category}</Badge>
      {children}
    </div>
  )}
/>