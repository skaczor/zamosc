# TODO: consider multi-tenant environment
class DaysController < ApplicationController
  before_action :parse_params_dates!, only: [:update, :create]
  before_action :load_day, only: [:edit, :update, :destroy]

  # GET /days
  # GET /days.json
  def index
    @days = date_search(*params.values_at(:year, :month).map { |v| v.to_i if v })
  end

  # GET /days/today
  # GET /days/1.json
  def show
    if params[:year] && params[:month] && params[:day]
      load_day
    else
      @day = CouchPotato.database.load_document(params[:id])
    end
    @notes = CouchPotato.database.view(Note.all(startkey: @day.on.iso8601,
                                                endkey: (@day.on + 1.day).iso8601))
  end

  # GET /days/new
  def new
    @day = Day.new
  end

  # GET /days/1/edit
  def edit
  end

  # POST /days
  # POST /days.json
  def create
    @day = Day.new(day_params)

    respond_to do |format|
      if CouchPotato.database.save_document(@day)
        format.html { redirect_to date_path(@day.on.year, @day.on.month, @day.on.day), notice: 'Day was successfully created.' }
        format.json { render :show, status: :created, location: date_path(@day.on.year, @day.on.month, @day.on.day) }
      else
        format.html { render :new }
        format.json { render json: @day.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /days/1
  # PATCH/PUT /days/1.json
  def update
    respond_to do |format|
      @day.attributes = day_params
      if CouchPotato.database.save_document(@day)
        format.html { redirect_to @day, notice: 'Day was successfully updated.' }
        format.json { render :show, status: :ok, location: @day }
      else
        format.html { render :edit }
        format.json { render json: @day.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /days/1
  # DELETE /days/1.json
  def destroy
    CouchPotato.database.destroy_document(@day)
    respond_to do |format|
      format.html { redirect_back fallback_location: root_path, notice: 'Day was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  private

  def load_day
    if params[:id]
      @day = CouchPotato.database.load_document(params[:id])
    else
      @day = date_find(get_date) || Day.new(on: get_date)
      CouchPotato.database.save_document(@day) if @day.new?
    end
  end

  def date_find(date)
    CouchPotato.database.first(Day.date(startkey: [date.year, date.month, date.day]))
  end

  def date_search(year, month)
    from, to = if month
                 [[year, month], [year, month + 1]]
               else
                 [[year], [year + 1]]
               end
    CouchPotato.database.view(Day.date(startkey: from, endkey: to))
  end
  
  def get_date
    Date.new(params[:year].to_i,
             params[:month].to_i,
             params[:day].to_i)
  end

  # Only allow a list of trusted parameters through.
  def day_params
    params.require(:day).permit(:on, :schedule)
  end

  def parse_params_dates!
    dp = params[:day]
    [:on].each do |key|
      next unless dp.key?("#{key}(1i)")
      y,m,d = (1..3).map { |i| dp.delete("#{key}(#{i}i)").to_i }
      dp[key] = Date.civil(y, m, d)
    end
    logger.debug dp.inspect
    logger.debug params.inspect
  end
end
