class Note
  include CouchPotato::Persistence

  property :title
  validates_presence_of :title
  property :description
  property :content

  view :all, key: :created_at, language: :javascript
  view :title, key: :title, language: :javascript

  before_save :save_rt

  # Returns the note documents matching the keyword
  def self.search(view, keyword)
    couch_server = CouchPotato.database.couchrest_database.root
    search_server = couch_server.clone
    search_server.path = "/local/#{couch_server.path[1..-1]}/_design/note/"
    search_server.port = 5985
    @search_server = RestClient::Resource.new(search_server)
    data = JSON.parse(@search_server[view].get(params: {q: keyword, stale: :ok}))
    data['rows'].map { |r| CouchPotato.database.load_document(r['id']) }
  end

  def save_rt
    self.description = @description_rt.body.to_html if @description_rt && @description_rt.dirty?
  end

  def description_rt
    @description_rt ||= RT.new(description)
  end

  def description_rt=(value)
    description_rt.body = value
  end

  class RT
    delegate :to_s, to: :body
    attr_reader :body

    def initialize(content)
      @body = ActionText::Content.new(content)
    end

    def dirty?
      @changed == true
    end

    def body=(value)
      @body = ActionText::Content.new(value)
      @changed = true
    end

    def to_plain_text
      body&.to_plain_text.to_s
    end

    delegate :blank?, :empty?, to: :to_plain_text
  end
end
