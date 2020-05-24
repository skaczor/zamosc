class Day
  include CouchPotato::Persistence

  property :on, type: Date
  property :date, type: Array
  validates_presence_of :on
  property :schedule

  view :all, key: :on, language: :javascript
  view :date, key: :date, language: :javascript

  before_save :set_date

  def set_date
    self.date = [on.year, on.month, on.day]
  end
end
